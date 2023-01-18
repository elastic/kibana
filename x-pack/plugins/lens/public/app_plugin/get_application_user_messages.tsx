/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { DataViewsState, VisualizationState } from '../state_management';
import type {
  Datasource,
  UserMessage,
  UserMessageFilters,
  UserMessagesDisplayLocationId,
  VisualizationMap,
} from '../types';
import { getMissingIndexPattern } from '../editor_frame_service/editor_frame/state_helpers';

/**
 * Provides a place to register general user messages that don't belong in the datasource or visualization objects
 */
export const getApplicationUserMessages = ({
  visualizationType,
  visualization,
  visualizationMap,
  activeDatasource,
  activeDatasourceState,
  dataViews,
  core,
}: {
  visualizationType: string | null | undefined;
  visualization: VisualizationState;
  visualizationMap: VisualizationMap;
  activeDatasource: Datasource | null;
  activeDatasourceState: { state: unknown } | null;
  dataViews: DataViewsState;
  core: CoreStart;
}): UserMessage[] => {
  const messages: UserMessage[] = [];

  if (!visualizationType) {
    messages.push(getMissingVisTypeError());
  }

  if (visualization.activeId && !visualizationMap[visualization.activeId]) {
    messages.push(getUnknownVisualizationTypeError(visualization.activeId));
  }

  if (!activeDatasource) {
    messages.push(getUnknownDatasourceTypeError());
  }

  const missingIndexPatterns = getMissingIndexPattern(
    activeDatasource,
    activeDatasourceState,
    dataViews.indexPatterns
  );

  if (missingIndexPatterns.length) {
    messages.push(...getMissingIndexPatternsErrors(core, missingIndexPatterns));
  }

  return messages;
};

function getMissingVisTypeError(): UserMessage {
  return {
    severity: 'warning',
    displayLocations: [{ id: 'visualization' }],
    fixableInEditor: true,
    shortMessage: '',
    longMessage: i18n.translate('xpack.lens.editorFrame.expressionMissingVisualizationType', {
      defaultMessage: 'Visualization type not found.',
    }),
  };
}

function getUnknownVisualizationTypeError(visType: string): UserMessage {
  return {
    severity: 'error',
    fixableInEditor: false,
    displayLocations: [{ id: 'visualization' }],
    shortMessage: i18n.translate('xpack.lens.unknownVisType.shortMessage', {
      defaultMessage: `Unknown visualization type`,
    }),
    longMessage: i18n.translate('xpack.lens.unknownVisType.longMessage', {
      defaultMessage: `The visualization type {visType} could not be resolved.`,
      values: {
        visType,
      },
    }),
  };
}

function getUnknownDatasourceTypeError(): UserMessage {
  return {
    severity: 'error',
    fixableInEditor: false,
    displayLocations: [{ id: 'visualization' }],
    shortMessage: i18n.translate('xpack.lens.unknownDatasourceType.shortMessage', {
      defaultMessage: `Unknown datasource type`,
    }),
    longMessage: i18n.translate('xpack.lens.editorFrame.expressionMissingDatasource', {
      defaultMessage: 'Could not find datasource for the visualization',
    }),
  };
}

function getMissingIndexPatternsErrors(
  core: CoreStart,
  missingIndexPatterns: string[]
): UserMessage[] {
  // Check for access to both Management app && specific indexPattern section
  const { management: isManagementEnabled } = core.application.capabilities.navLinks;
  const isIndexPatternManagementEnabled =
    core.application.capabilities.management.kibana.indexPatterns;
  const canFix = isManagementEnabled && isIndexPatternManagementEnabled;
  return [
    {
      severity: 'error',
      fixableInEditor: canFix,
      displayLocations: [{ id: 'visualizationInEditor' }],
      shortMessage: '',
      longMessage: (
        <>
          <p className="eui-textBreakWord" data-test-subj="missing-refs-failure">
            <FormattedMessage
              id="xpack.lens.editorFrame.dataViewNotFound"
              defaultMessage="Data view not found"
            />
          </p>
          <p
            className="eui-textBreakWord"
            style={{
              userSelect: 'text',
            }}
          >
            <FormattedMessage
              id="xpack.lens.indexPattern.missingDataView"
              defaultMessage="The {count, plural, one {data view} other {data views}} ({count, plural, one {id} other {ids}}: {indexpatterns}) cannot be found."
              values={{
                count: missingIndexPatterns.length,
                indexpatterns: missingIndexPatterns.join(', '),
              }}
            />
            {canFix && (
              <RedirectAppLinks coreStart={core}>
                <a
                  href={core.application.getUrlForApp('management', {
                    path: '/kibana/indexPatterns/create',
                  })}
                  style={{ width: '100%', textAlign: 'center' }}
                  data-test-subj="configuration-failure-reconfigure-indexpatterns"
                >
                  {i18n.translate('xpack.lens.editorFrame.dataViewReconfigure', {
                    defaultMessage: `Recreate it in the data view management page.`,
                  })}
                </a>
              </RedirectAppLinks>
            )}
          </p>
        </>
      ),
    },
    {
      severity: 'error',
      fixableInEditor: canFix,
      displayLocations: [{ id: 'visualizationOnEmbeddable' }],
      shortMessage: '',
      longMessage: i18n.translate('xpack.lens.editorFrame.expressionMissingDataView', {
        defaultMessage:
          'Could not find the {count, plural, one {data view} other {data views}}: {ids}',
        values: { count: missingIndexPatterns.length, ids: missingIndexPatterns.join(', ') },
      }),
    },
  ];
}

export const filterUserMessages = (
  userMessages: UserMessage[],
  locationId: UserMessagesDisplayLocationId | UserMessagesDisplayLocationId[] | undefined,
  { dimensionId, layerId, severity }: UserMessageFilters
) => {
  const locationIds = Array.isArray(locationId)
    ? locationId
    : typeof locationId === 'string'
    ? [locationId]
    : [];

  return userMessages.filter((message) => {
    if (locationIds.length) {
      const locationMatch = message.displayLocations.find((location) => {
        if (!locationIds.includes(location.id)) {
          return false;
        }

        if (
          location.id === 'dimensionTrigger' &&
          (location.dimensionId !== dimensionId || location.layerId !== layerId)
        ) {
          return false;
        }

        return true;
      });

      if (!locationMatch) {
        return false;
      }
    }

    if (severity && message.severity !== severity) {
      return false;
    }

    return true;
  });
};
