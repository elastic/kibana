/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiCodeBlock,
  EuiTitle,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';

import { ComponentTemplateDeserialized } from '../shared_imports';

interface Props {
  componentTemplateDetails: ComponentTemplateDeserialized;
}

export const TabSummary: React.FunctionComponent<Props> = ({ componentTemplateDetails }) => {
  const { version, _meta, _kbnMeta } = componentTemplateDetails;

  const { usedBy } = _kbnMeta;
  const templateIsInUse = usedBy.length > 0;

  return (
    <>
      {/* Callout when component template is not in use */}
      {!templateIsInUse && (
        <>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.idxMgmt.componentTemplateDetails.summaryTab.notInUseTitle"
                defaultMessage="This component template is not in use by any index templates."
              />
            }
            iconType="pin"
            data-test-subj="notInUseCallout"
            size="s"
          />
          <EuiSpacer />
        </>
      )}

      {/* Summary description list */}
      <EuiDescriptionList textStyle="reverse" data-test-subj="summaryTabContent">
        {/* Used by templates */}
        {templateIsInUse && (
          <>
            <EuiDescriptionListTitle data-test-subj="usedByTitle">
              <FormattedMessage
                id="xpack.idxMgmt.componentTemplateDetails.summaryTab.usedByDescriptionListTitle"
                defaultMessage="Used by"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <ul>
                {usedBy.map((templateName: string) => (
                  <li key={templateName}>
                    <EuiTitle size="xs">
                      <span>{templateName}</span>
                    </EuiTitle>
                  </li>
                ))}
              </ul>
            </EuiDescriptionListDescription>
          </>
        )}

        {/* Version (optional) */}
        {version && (
          <>
            <EuiDescriptionListTitle data-test-subj="versionTitle">
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
            <EuiDescriptionListTitle data-test-subj="metaTitle">
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
    </>
  );
};
