/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Capabilities, HttpSetup, SavedObjectsClientContract } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { RecursiveReadonly } from '@kbn/utility-types';
import { toExpression } from '@kbn/interpreter/target/common';
import {
  IndexPatternsContract,
  IndexPattern,
  TimefilterContract,
} from '../../../../../../src/plugins/data/public';
import { ReactExpressionRendererType } from '../../../../../../src/plugins/expressions/public';
import {
  EmbeddableFactoryDefinition,
  ErrorEmbeddable,
  EmbeddableInput,
  IContainer,
} from '../../../../../../src/plugins/embeddable/public';
import { Embeddable } from './embeddable';
import { SavedObjectIndexStore, DOC_TYPE, getFilterableIndexPatternIds } from '../../persistence';
import { getEditPath } from '../../../common';
import { UiActionsStart } from '../../../../../../src/plugins/ui_actions/public';
import { buildExpression } from '../editor_frame/expression_helpers';
import { Datasource, Visualization, DatasourcePublicAPI, FramePublicAPI } from '../../types';

interface StartServices {
  timefilter: TimefilterContract;
  coreHttp: HttpSetup;
  capabilities: RecursiveReadonly<Capabilities>;
  savedObjectsClient: SavedObjectsClientContract;
  expressionRenderer: ReactExpressionRendererType;
  indexPatternService: IndexPatternsContract;
  uiActions?: UiActionsStart;
  datasources: Record<string, Datasource<unknown, unknown>>;
  visualizations: Record<string, Visualization<unknown>>;
}

export class EmbeddableFactory implements EmbeddableFactoryDefinition {
  type = DOC_TYPE;
  savedObjectMetaData = {
    name: i18n.translate('xpack.lens.lensSavedObjectLabel', {
      defaultMessage: 'Lens Visualization',
    }),
    type: DOC_TYPE,
    getIconForSavedObject: () => 'lensApp',
  };

  constructor(private getStartServices: () => Promise<StartServices>) {}

  public isEditable = async () => {
    const { capabilities } = await this.getStartServices();
    return capabilities.visualize.save as boolean;
  };

  canCreateNew() {
    return false;
  }

  getDisplayName() {
    return i18n.translate('xpack.lens.embeddableDisplayName', {
      defaultMessage: 'lens',
    });
  }

  createFromSavedObject = async (
    savedObjectId: string,
    input: Partial<EmbeddableInput> & { id: string },
    parent?: IContainer
  ) => {
    const {
      savedObjectsClient,
      coreHttp,
      indexPatternService,
      timefilter,
      expressionRenderer,
      uiActions,
      datasources,
      visualizations,
    } = await this.getStartServices();
    const store = new SavedObjectIndexStore(savedObjectsClient);
    const savedVis = await store.load(savedObjectId);

    const promises = getFilterableIndexPatternIds(savedVis).map(async (id) => {
      try {
        return await indexPatternService.get(id);
      } catch (error) {
        // Unable to load index pattern, ignore error as the index patterns are only used to
        // configure the filter and query bar - there is still a good chance to get the visualization
        // to show.
        return null;
      }
    });
    const indexPatterns = (
      await Promise.all(promises)
    ).filter((indexPattern: IndexPattern | null): indexPattern is IndexPattern =>
      Boolean(indexPattern)
    );

    const datasourceStates: Record<string, { isLoading: boolean; state: unknown }> = {};

    await Promise.all(
      Object.entries(datasources).map(([datasourceId, datasource]) => {
        if (savedVis.state.datasourceStates[datasourceId]) {
          return datasource
            .initialize(savedVis.state.datasourceStates[datasourceId], savedVis.references)
            .then((datasourceState) => {
              datasourceStates[datasourceId] = { isLoading: false, state: datasourceState };
            });
        }
      })
    );

    const datasourceLayers: Record<string, DatasourcePublicAPI> = {};
    Object.keys(datasources)
      .filter((id) => datasourceStates[id])
      .forEach((id) => {
        const datasourceState = datasourceStates[id].state;
        const datasource = datasources[id];

        const layers = datasource.getLayers(datasourceState);
        layers.forEach((layer) => {
          datasourceLayers[layer] = datasource.getPublicAPI({
            state: datasourceState,
            layerId: layer,
            dateRange: { fromDate: 'now', toDate: 'now' },
          });
        });
      });

    const framePublicAPI: FramePublicAPI = {
      datasourceLayers,
      dateRange: { fromDate: 'now', toDate: 'now' },
      query: savedVis.state.query,
      filters: savedVis.state.filters,

      addNewLayer() {
        throw new Error('adding new layer is not allowed in embedded mode');
      },

      removeLayers() {
        throw new Error('removing layers is not allowed in embedded mode');
      },
    };

    const expression = buildExpression({
      visualization: visualizations[savedVis.visualizationType!],
      visualizationState: savedVis.state.visualization,
      datasourceMap: datasources,
      datasourceStates,
      framePublicAPI,
      removeDateRange: true,
    });

    return new Embeddable(
      timefilter,
      expressionRenderer,
      uiActions?.getTrigger,
      {
        savedVis,
        editPath: getEditPath(savedObjectId),
        editUrl: coreHttp.basePath.prepend(`/app/lens${getEditPath(savedObjectId)}`),
        editable: await this.isEditable(),
        indexPatterns,
        expression: expression ? toExpression(expression) : null,
      },
      input,
      parent
    );
  };

  async create(input: EmbeddableInput) {
    return new ErrorEmbeddable('Lens can only be created from a saved object', input);
  }
}
