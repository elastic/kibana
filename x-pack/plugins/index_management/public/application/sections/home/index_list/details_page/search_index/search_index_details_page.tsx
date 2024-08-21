/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPageSection,
  EuiPopover,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FunctionComponent } from 'react';
import { RouteComponentProps } from 'react-router';
import { Index } from '../../../../../../../common';
import { loadIndex } from '../../../../../services';
import { Error } from '../../../../../../shared_imports';
import { i18n } from '@kbn/i18n';

export const SearchIndexDetailsPage: FunctionComponent<
  RouteComponentProps<{ indexName: string }>
> = ({ location: { search }, history }) => {
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const indexName = queryParams.get('indexName') ?? '';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [index, setIndex] = useState<Index | null>();
  const [showMoreOptionsPopover, setShowMoreOptionsPopover] = useState<boolean>(false);
  const fetchIndexDetails = useCallback(async () => {
    if (indexName) {
      setIsLoading(true);
      try {
        const { data, error: loadingError } = await loadIndex(indexName);
        setIsLoading(false);
        setError(loadingError);
        setIndex(data);
      } catch (e) {
        setIsLoading(false);
        setError(e);
      }
    }
  }, [indexName]);
  useEffect(() => {
    fetchIndexDetails();
  }, [fetchIndexDetails]);

  const pageTitle = <>{index?.name}</>;
  return (
    <>
      <EuiPageSection paddingSize="none"></EuiPageSection>
      <EuiPageHeader
        data-test-subj="indexDetailsHeader"
        pageTitle={pageTitle}
        rightSideItems={
          isLoading
            ? []
            : [
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiPopover
                      isOpen={showMoreOptionsPopover}
                      button={
                        <EuiButtonIcon
                          data-test-subj="searchindexDetailsMoreOptionsButton"
                          data-telemetry-id="idxMgmt-indexDetails-moreOptionsButton"
                          color="primary"
                          display="fill"
                          size="m"
                          iconType="boxesVertical"
                          aria-label={i18n.translate('xpack.idxMgmt.indexDetails.more.ariaLabel', {
                            defaultMessage: 'More options',
                          })}
                          onClick={() => setShowMoreOptionsPopover(!showMoreOptionsPopover)}
                        />
                      }
                    >
                      <EuiContextMenuPanel
                        size="s"
                        items={[
                          <EuiContextMenuItem key="edit" icon="trash" onClick={() => {}}>
                            {i18n.translate('xpack.idxMgmt.indexDetails.deleteIndexLabel', {
                              defaultMessage: 'Delete Index',
                            })}
                          </EuiContextMenuItem>,
                        ]}
                      />
                    </EuiPopover>
                  </EuiFlexItem>
                </EuiFlexGroup>,
              ]
        }
      >
        MY DESCRIPTION
      </EuiPageHeader>
      <EuiSpacer size="l" />
      <div data-test-subj={`indexDetailsContent`}></div>
    </>
  );
};
