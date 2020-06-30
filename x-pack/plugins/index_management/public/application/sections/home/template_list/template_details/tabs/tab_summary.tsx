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
  EuiFlexGroup,
  EuiFlexItem,
  EuiCodeBlock,
} from '@elastic/eui';
import { TemplateDeserialized } from '../../../../../../../common';
import { getILMPolicyPath } from '../../../../../services/navigation';

interface Props {
  templateDetails: TemplateDeserialized;
}

const NoneDescriptionText = () => (
  <FormattedMessage
    id="xpack.idxMgmt.templateDetails.summaryTab.noneDescriptionText"
    defaultMessage="None"
  />
);

export const TabSummary: React.FunctionComponent<Props> = ({ templateDetails }) => {
  const {
    version,
    priority,
    composedOf,
    order,
    indexPatterns = [],
    ilmPolicy,
    _meta,
    _kbnMeta: { isLegacy },
  } = templateDetails;

  const numIndexPatterns = indexPatterns.length;

  return (
    <EuiFlexGroup data-test-subj="summaryTab">
      <EuiFlexItem>
        <EuiDescriptionList textStyle="reverse">
          {/* Index patterns */}
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

          {/* Priority / Order */}
          {isLegacy !== true ? (
            <>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.idxMgmt.templateDetails.summaryTab.priorityDescriptionListTitle"
                  defaultMessage="Priority"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {priority || priority === 0 ? priority : <NoneDescriptionText />}
              </EuiDescriptionListDescription>
            </>
          ) : (
            <>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.idxMgmt.templateDetails.summaryTab.orderDescriptionListTitle"
                  defaultMessage="Order"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {order || order === 0 ? order : <NoneDescriptionText />}
              </EuiDescriptionListDescription>
            </>
          )}

          {/* Components */}
          {isLegacy !== true && (
            <>
              <EuiDescriptionListTitle data-test-subj="componentsTitle">
                <FormattedMessage
                  id="xpack.idxMgmt.templateDetails.summaryTab.componentsDescriptionListTitle"
                  defaultMessage="Components"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {composedOf && composedOf.length > 0 ? (
                  <ul>
                    {composedOf.map((component) => (
                      <li key={component}>
                        <EuiTitle size="xs">
                          <span>{component}</span>
                        </EuiTitle>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <NoneDescriptionText />
                )}
              </EuiDescriptionListDescription>
            </>
          )}
        </EuiDescriptionList>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiDescriptionList textStyle="reverse">
          {/* ILM Policy */}
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

          {/* Version */}
          <EuiDescriptionListTitle>
            <FormattedMessage
              id="xpack.idxMgmt.templateDetails.summaryTab.versionDescriptionListTitle"
              defaultMessage="Version"
            />
          </EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            {version || version === 0 ? version : <NoneDescriptionText />}
          </EuiDescriptionListDescription>

          {/* Metadata (optional) */}
          {isLegacy !== true && _meta && (
            <>
              <EuiDescriptionListTitle data-test-subj="metaTitle">
                <FormattedMessage
                  id="xpack.idxMgmt.templateDetails.summaryTab.metaDescriptionListTitle"
                  defaultMessage="Metadata"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                <EuiCodeBlock lang="json">{JSON.stringify(_meta, null, 2)}</EuiCodeBlock>
              </EuiDescriptionListDescription>
            </>
          )}
        </EuiDescriptionList>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
