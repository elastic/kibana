/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SavedObjectFinder, SavedObjectMetaData } from '@kbn/saved-objects-finder-plugin/public';
import { FinderAttributes } from '@kbn/saved-objects-finder-plugin/common';
import { EmbeddableFactory, ReactEmbeddableSavedObject } from '@kbn/embeddable-plugin/public';
import { useEmbeddablesService, usePlatformService } from '../../services';

const strings = {
  getNoItemsText: () =>
    i18n.translate('xpack.canvas.embedObject.noMatchingObjectsMessage', {
      defaultMessage: 'No matching objects found.',
    }),
  getTitleText: () =>
    i18n.translate('xpack.canvas.embedObject.titleText', {
      defaultMessage: 'Add from library',
    }),
};

interface LegacyFactoryMap {
  [key: string]: EmbeddableFactory;
}
interface FactoryMap<TSavedObjectAttributes extends FinderAttributes = FinderAttributes> {
  [key: string]: ReactEmbeddableSavedObject<TSavedObjectAttributes> & { type: string };
}

export interface Props {
  onClose: () => void;
  onSelect: (id: string, embeddableType: string, isByValueEnabled?: boolean) => void;
  availableEmbeddables: string[];
  isByValueEnabled?: boolean;
}

export const AddEmbeddableFlyout: FC<Props> = ({
  onSelect,
  availableEmbeddables,
  onClose,
  isByValueEnabled,
}) => {
  const embeddablesService = useEmbeddablesService();
  const platformService = usePlatformService();
  const { getEmbeddableFactories, getReactEmbeddableSavedObjects } = embeddablesService;
  const { getContentManagement, getUISettings } = platformService;

  const legacyFactoriesBySavedObjectType: LegacyFactoryMap = useMemo(() => {
    return [...getEmbeddableFactories()]
      .filter(
        (embeddableFactory) =>
          Boolean(embeddableFactory.savedObjectMetaData?.type) && !embeddableFactory.isContainerType
      )
      .reduce((acc, factory) => {
        acc[factory.savedObjectMetaData!.type] = factory;
        return acc;
      }, {} as LegacyFactoryMap);
  }, [getEmbeddableFactories]);

  const factoriesBySavedObjectType: FactoryMap = useMemo(() => {
    return [...getReactEmbeddableSavedObjects()]
      .filter(([type, embeddableFactory]) => {
        return Boolean(embeddableFactory.savedObjectMetaData?.type);
      })
      .reduce((acc, [type, factory]) => {
        acc[factory.savedObjectMetaData!.type] = {
          ...factory,
          type,
        };
        return acc;
      }, {} as FactoryMap);
  }, [getReactEmbeddableSavedObjects]);

  const metaData = useMemo(
    () =>
      [
        ...Object.values(factoriesBySavedObjectType),
        ...Object.values(legacyFactoriesBySavedObjectType),
      ]
        .filter((factory) =>
          Boolean(
            factory.type !== 'links' && // Links panels only exist on Dashboards
              (isByValueEnabled || availableEmbeddables.includes(factory.type))
          )
        )
        .map((factory) => factory.savedObjectMetaData)
        .filter<SavedObjectMetaData<{}>>(function (
          maybeSavedObjectMetaData
        ): maybeSavedObjectMetaData is SavedObjectMetaData<{}> {
          return maybeSavedObjectMetaData !== undefined;
        })
        .sort((a, b) => a.type.localeCompare(b.type)),
    [
      availableEmbeddables,
      factoriesBySavedObjectType,
      isByValueEnabled,
      legacyFactoriesBySavedObjectType,
    ]
  );

  const onAddPanel = useCallback(
    (id: string, savedObjectType: string) => {
      if (factoriesBySavedObjectType[savedObjectType]) {
        const factory = factoriesBySavedObjectType[savedObjectType];
        const { type } = factory;
        onSelect(id, type, isByValueEnabled);
        return;
      }
      const embeddableFactories = getEmbeddableFactories();
      // Find the embeddable type from the saved object type
      const found = Array.from(embeddableFactories).find((embeddableFactory) => {
        return Boolean(
          embeddableFactory.savedObjectMetaData &&
            embeddableFactory.savedObjectMetaData.type === savedObjectType
        );
      });

      const foundEmbeddableType = found ? found.type : 'unknown';

      onSelect(id, foundEmbeddableType, isByValueEnabled);
    },
    [isByValueEnabled, getEmbeddableFactories, onSelect, factoriesBySavedObjectType]
  );

  return (
    <EuiFlyout ownFocus onClose={onClose} data-test-subj="dashboardAddPanel">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{strings.getTitleText()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SavedObjectFinder
          onChoose={onAddPanel}
          savedObjectMetaData={metaData}
          showFilter={true}
          noItemsMessage={strings.getNoItemsText()}
          services={{
            contentClient: getContentManagement().client,
            uiSettings: getUISettings(),
          }}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
