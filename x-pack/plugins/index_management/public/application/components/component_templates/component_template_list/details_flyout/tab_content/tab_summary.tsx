/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiHealth,
  EuiCodeBlock,
} from '@elastic/eui';
import { ComponentTemplateDeserialized } from '../../../types';

interface Props {
  componentTemplateDetails: ComponentTemplateDeserialized;
}

export const TabSummary: React.FunctionComponent<Props> = ({ componentTemplateDetails }) => {
  const { version, _meta, _kbnMeta } = componentTemplateDetails;

  const { usedBy } = _kbnMeta;
  const templateIsInUse = usedBy.length > 0;

  const statusLabel = templateIsInUse
    ? i18n.translate('xpack.idxMgmt.componentTemplateDetails.summaryTab.inUseDescription', {
        defaultMessage: 'In use',
      })
    : i18n.translate('xpack.idxMgmt.componentTemplateDetails.summaryTab.notInUseDescription', {
        defaultMessage: 'Not in use',
      });

  const statusColor = templateIsInUse ? 'success' : 'danger';

  return (
    <EuiDescriptionList textStyle="reverse" data-test-subj="summaryTab">
      {/* Status */}
      <EuiDescriptionListTitle>
        <FormattedMessage
          id="xpack.idxMgmt.componentTemplateDetails.summaryTab.statusDescriptionListTitle"
          defaultMessage="Status"
        />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <EuiHealth color={statusColor}>{statusLabel}</EuiHealth>
      </EuiDescriptionListDescription>

      {/* Version (optional) */}
      {version && (
        <>
          <EuiDescriptionListTitle>
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateDetails.summaryTab.versionDescriptionListTitle"
              defaultMessage="Version"
            />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>{version}</EuiDescriptionListDescription>
        </>
      )}

      {/* Metadata (optional) */}
      {_meta && (
        <>
          <EuiDescriptionListTitle>
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateDetails.summaryTab.metaDescriptionListTitle"
              defaultMessage="Metadata"
            />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <EuiCodeBlock lang="json">{JSON.stringify(_meta, null, 2)}</EuiCodeBlock>
          </EuiDescriptionListDescription>
        </>
      )}
    </EuiDescriptionList>
  );
};
