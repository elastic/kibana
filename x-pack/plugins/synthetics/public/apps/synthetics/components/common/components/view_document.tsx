/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import React, { useState } from 'react';
import { useUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { UnifiedDocViewer } from '@kbn/unified-doc-viewer-plugin/public';
import { i18n } from '@kbn/i18n';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { DataTableRecord } from '@kbn/discover-utils/src/types';
import { useDateFormat } from '../../../../../hooks/use_date_format';
import { LoadingState } from '../../monitors_page/overview/overview/monitor_detail_flyout';
import { useSyntheticsDataView } from '../../../contexts/synthetics_data_view_context';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { Ping } from '../../../../../../common/runtime_types';

export const ViewDocument = ({ ping }: { ping: Ping }) => {
  const { data } = useUnifiedDocViewerServices();
  const [isFlyoutVisible, setIsFlyoutVisible] = useState<boolean>(false);

  const dataView = useSyntheticsDataView();
  const formatter = useDateFormat();

  const { data: hit } = useFetcher<Promise<DataTableRecord | undefined>>(async () => {
    if (!dataView?.id || !isFlyoutVisible) return;
    const response = await data.search
      .search({
        params: {
          index: SYNTHETICS_INDEX_PATTERN,
          body: {
            query: {
              ids: {
                values: [ping.docId],
              },
            },
            fields: ['*'],
            _source: false,
          },
        },
      })
      .toPromise();
    const docs = response?.rawResponse?.hits?.hits ?? [];
    if (docs.length > 0) {
      return buildDataTableRecord(docs[0], dataView);
    }
  }, [data, dataView, ping.docId, isFlyoutVisible]);

  return (
    <>
      <EuiButtonIcon
        data-test-subj="syntheticsViewDocumentButton"
        iconType="inspect"
        title={INSPECT_DOCUMENT}
        onClick={() => {
          setIsFlyoutVisible(true);
        }}
      />
      {isFlyoutVisible && (
        <EuiFlyout onClose={() => setIsFlyoutVisible(false)} ownFocus={true}>
          <EuiFlyoutHeader>
            <EuiTitle size="m">
              <h4>
                {INDEXED_AT} {formatter(ping.timestamp)}
              </h4>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            {dataView?.id && hit ? (
              <UnifiedDocViewer hit={hit} dataView={dataView} />
            ) : (
              <LoadingState />
            )}
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};

const INDEXED_AT = i18n.translate('xpack.synthetics.monitorDetails.summary.indexedAt', {
  defaultMessage: 'Indexed at',
});

export const INSPECT_DOCUMENT = i18n.translate(
  'xpack.synthetics.monitorDetails.action.inspectDocument',
  {
    defaultMessage: 'Inspect document',
  }
);
