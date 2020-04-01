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
  EuiLink,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { Template } from '../../../../../../../common/types';
import { getILMPolicyPath } from '../../../../../services/navigation';

interface Props {
  templateDetails: Template;
}

const NoneDescriptionText = () => (
  <FormattedMessage
    id="xpack.idxMgmt.templateDetails.summaryTab.noneDescriptionText"
    defaultMessage="None"
  />
);

export const TabSummary: React.FunctionComponent<Props> = ({ templateDetails }) => {
  const { version, order, indexPatterns = [], ilmPolicy } = templateDetails;

  const numIndexPatterns = indexPatterns.length;

  return (
    <EuiDescriptionList textStyle="reverse" data-test-subj="summaryTab">
      <EuiDescriptionListTitle>
        <FormattedMessage
          id="xpack.idxMgmt.templateDetails.summaryTab.indexPatternsDescriptionListTitle"
          defaultMessage="Index {numIndexPatterns, plural, one {pattern} other {patterns}}"
          values={{ numIndexPatterns }}
        />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {numIndexPatterns > 1 ? (
          <EuiText>
            <ul>
              {indexPatterns.map((indexName: string, i: number) => {
                return (
                  <li key={`${indexName}-${i}`}>
                    <EuiTitle size="xs">
                      <span>{indexName}</span>
                    </EuiTitle>
                  </li>
                );
              })}
            </ul>
          </EuiText>
        ) : (
          indexPatterns.toString()
        )}
      </EuiDescriptionListDescription>
      <EuiDescriptionListTitle>
        <FormattedMessage
          id="xpack.idxMgmt.templateDetails.summaryTab.ilmPolicyDescriptionListTitle"
          defaultMessage="ILM policy"
        />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {ilmPolicy && ilmPolicy.name ? (
          <EuiLink href={getILMPolicyPath(ilmPolicy.name)}>{ilmPolicy.name}</EuiLink>
        ) : (
          <NoneDescriptionText />
        )}
      </EuiDescriptionListDescription>
      <EuiDescriptionListTitle>
        <FormattedMessage
          id="xpack.idxMgmt.templateDetails.summaryTab.orderDescriptionListTitle"
          defaultMessage="Order"
        />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {order || order === 0 ? order : <NoneDescriptionText />}
      </EuiDescriptionListDescription>
      <EuiDescriptionListTitle>
        <FormattedMessage
          id="xpack.idxMgmt.templateDetails.summaryTab.versionDescriptionListTitle"
          defaultMessage="Version"
        />
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {version || version === 0 ? version : <NoneDescriptionText />}
      </EuiDescriptionListDescription>
    </EuiDescriptionList>
  );
};
