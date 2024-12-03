/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC, useCallback, useMemo } from 'react';

import { useAddFromLibraryTypes } from '@kbn/embeddable-plugin/public';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import {
  contentManagementService,
  coreServices,
} from '../../services/kibana_services';

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
  const { types, getAddFromLibraryType } = useAddFromLibraryTypes();

  const canvasOnlyTypes = useMemo(() => {
    // Links panels are not supported in Canvas
    return types.filter(({ type }) => type !== 'links');
  }, [types])

  const onAddPanel = useCallback(
    (id: string, savedObjectType: string) => {
        const factory = getAddFromLibraryType(savedObjectType);
        if (!factory) return;
        onSelect(id, savedObjectType, isByValueEnabled);
        return;
    },
    [isByValueEnabled, onSelect]
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
          id="canvasEmbeddableFlyout"
          onChoose={onAddPanel}
          savedObjectMetaData={canvasOnlyTypes}
          showFilter={true}
          noItemsMessage={strings.getNoItemsText()}
          services={{
            contentClient: contentManagementService.client,
            uiSettings: coreServices.uiSettings,
          }}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
