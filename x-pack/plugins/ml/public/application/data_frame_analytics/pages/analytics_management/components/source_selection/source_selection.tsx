/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';

import { SavedObjectFinderUi } from '../../../../../../../../../../src/plugins/saved_objects/public';
import { useMlKibana } from '../../../../../contexts/kibana';

const fixedPageSize: number = 8;

interface Props {
  onClose: () => void;
}

export const SourceSelection: FC<Props> = ({ onClose }) => {
  const {
    services: {
      application: { navigateToUrl },
      savedObjects,
      uiSettings,
    },
  } = useMlKibana();

  const onSearchSelected = async (id: string, type: string) => {
    await navigateToUrl(
      `ml#/data_frame_analytics/new_job?${
        type === 'index-pattern' ? 'index' : 'savedSearchId'
      }=${encodeURIComponent(id)}`
    );
  };

  return (
    <>
      <EuiOverlayMask>
        <EuiModal
          className="dataFrameAnalyticsCreateSearchDialog"
          onClose={onClose}
          data-test-subj="analyticsCreateSourceIndexModal"
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              <FormattedMessage
                id="xpack.ml.dataframe.analytics.create.newAnalyticsTitle"
                defaultMessage="New analytics job"
              />{' '}
              /{' '}
              <FormattedMessage
                id="xpack.ml.dataframe.analytics.create.chooseSourceTitle"
                defaultMessage="Choose a source index pattern"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <SavedObjectFinderUi
              key="searchSavedObjectFinder"
              onChoose={onSearchSelected}
              showFilter
              noItemsMessage={i18n.translate(
                'xpack.ml.dataFrame.analytics.create.searchSelection.notFoundLabel',
                {
                  defaultMessage: 'No matching indices or saved searches found.',
                }
              )}
              savedObjectMetaData={[
                {
                  type: 'search',
                  getIconForSavedObject: () => 'search',
                  name: i18n.translate(
                    'xpack.ml.dataFrame.analytics.create.searchSelection.savedObjectType.search',
                    {
                      defaultMessage: 'Saved search',
                    }
                  ),
                },
                {
                  type: 'index-pattern',
                  getIconForSavedObject: () => 'indexPatternApp',
                  name: i18n.translate(
                    'xpack.ml.dataFrame.analytics.create.searchSelection.savedObjectType.indexPattern',
                    {
                      defaultMessage: 'Index pattern',
                    }
                  ),
                },
              ]}
              fixedPageSize={fixedPageSize}
              uiSettings={uiSettings}
              savedObjects={savedObjects}
            />
          </EuiModalBody>
        </EuiModal>
      </EuiOverlayMask>
    </>
  );
};
