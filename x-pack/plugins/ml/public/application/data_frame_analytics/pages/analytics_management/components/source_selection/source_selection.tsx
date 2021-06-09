/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiCallOut,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';

import type { SimpleSavedObject } from 'src/core/public';

import { SavedObjectFinderUi } from '../../../../../../../../../../src/plugins/saved_objects/public';
import { useMlKibana, useNavigateToPath } from '../../../../../contexts/kibana';

import { getNestedProperty } from '../../../../../util/object_utils';

import { getIndexPatternAndSavedSearch, isCcsIndexPattern } from '../../../../../util/index_utils';

const fixedPageSize: number = 8;

interface Props {
  onClose: () => void;
}

export const SourceSelection: FC<Props> = ({ onClose }) => {
  const {
    services: { savedObjects, uiSettings },
  } = useMlKibana();
  const navigateToPath = useNavigateToPath();

  const [isCcsCallOut, setIsCcsCallOut] = useState(false);
  const [ccsCallOutBodyText, setCcsCallOutBodyText] = useState<string>();

  const onSearchSelected = async (
    id: string,
    type: string,
    fullName: string,
    savedObject: SimpleSavedObject
  ) => {
    // Kibana index patterns including `:` are cross-cluster search indices
    // and are not supported by Data Frame Analytics yet. For saved searches
    // and index patterns that use cross-cluster search we intercept
    // the selection before redirecting and show an error callout instead.
    let indexPatternTitle = '';

    if (type === 'index-pattern') {
      indexPatternTitle = getNestedProperty(savedObject, 'attributes.title');
    } else if (type === 'search') {
      const indexPatternAndSavedSearch = await getIndexPatternAndSavedSearch(id);
      indexPatternTitle = indexPatternAndSavedSearch.indexPattern?.title ?? '';
    }

    if (isCcsIndexPattern(indexPatternTitle)) {
      setIsCcsCallOut(true);
      if (type === 'search') {
        setCcsCallOutBodyText(
          i18n.translate(
            'xpack.ml.dataFrame.analytics.create.searchSelection.CcsErrorCallOutBody',
            {
              defaultMessage: `The saved search '{savedSearchTitle}' uses the index pattern '{indexPatternTitle}'.`,
              values: {
                savedSearchTitle: getNestedProperty(savedObject, 'attributes.title'),
                indexPatternTitle,
              },
            }
          )
        );
      } else {
        setCcsCallOutBodyText(undefined);
      }
      return;
    }

    await navigateToPath(
      `/data_frame_analytics/new_job?${
        type === 'index-pattern' ? 'index' : 'savedSearchId'
      }=${encodeURIComponent(id)}`
    );
  };

  return (
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
        {isCcsCallOut && (
          <>
            <EuiCallOut
              data-test-subj="analyticsCreateSourceIndexModalCcsErrorCallOut"
              title={i18n.translate(
                'xpack.ml.dataFrame.analytics.create.searchSelection.CcsErrorCallOutTitle',
                {
                  defaultMessage: 'Index patterns using cross-cluster search are not supported.',
                }
              )}
              color="danger"
            >
              {typeof ccsCallOutBodyText === 'string' && <p>{ccsCallOutBodyText}</p>}
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
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
  );
};
