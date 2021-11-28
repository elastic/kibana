/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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
  EuiSpacer,
} from '@elastic/eui';
import { TemplateDeserialized } from '../../../../../../../common';
import { ILM_PAGES_POLICY_EDIT } from '../../../../../constants';
import { useIlmLocator } from '../../../../../services/use_ilm_locator';

interface Props {
  templateDetails: TemplateDeserialized;
}

const i18nTexts = {
  yes: i18n.translate('xpack.idxMgmt.templateDetails.summaryTab.yesDescriptionText', {
    defaultMessage: 'Yes',
  }),
  no: i18n.translate('xpack.idxMgmt.templateDetails.summaryTab.noDescriptionText', {
    defaultMessage: 'No',
  }),
  none: i18n.translate('xpack.idxMgmt.templateDetails.summaryTab.noneDescriptionText', {
    defaultMessage: 'None',
  }),
};

export const TabSummary: React.FunctionComponent<Props> = ({ templateDetails }) => {
  const {
    version,
    priority,
    composedOf,
    order,
    indexPatterns = [],
    ilmPolicy,
    _meta,
    _kbnMeta: { isLegacy, hasDatastream },
  } = templateDetails;

  const numIndexPatterns = indexPatterns.length;

  const ilmPolicyLink = useIlmLocator(ILM_PAGES_POLICY_EDIT, ilmPolicy?.name);

  return (
    <>
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
                  {priority || priority === 0 ? priority : i18nTexts.none}
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
                  {order || order === 0 ? order : i18nTexts.none}
                </EuiDescriptionListDescription>
              </>
            )}

            {/* Components */}
            {isLegacy !== true && (
              <>
                <EuiDescriptionListTitle data-test-subj="componentsTitle">
                  <FormattedMessage
                    id="xpack.idxMgmt.templateDetails.summaryTab.componentsDescriptionListTitle"
                    defaultMessage="Component templates"
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
                    i18nTexts.none
                  )}
                </EuiDescriptionListDescription>
              </>
            )}
          </EuiDescriptionList>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiDescriptionList textStyle="reverse">
            {/* ILM Policy (only for legacy as composable template could have ILM policy
              inside one of their components) */}
            {isLegacy && (
              <>
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.idxMgmt.templateDetails.summaryTab.ilmPolicyDescriptionListTitle"
                    defaultMessage="ILM policy"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {ilmPolicy?.name && ilmPolicyLink ? (
                    <EuiLink href={ilmPolicyLink}>{ilmPolicy!.name}</EuiLink>
                  ) : (
                    ilmPolicy?.name || i18nTexts.none
                  )}
                </EuiDescriptionListDescription>
              </>
            )}

            {/* Has data stream? (only for composable template) */}
            {isLegacy !== true && (
              <>
                <EuiDescriptionListTitle>
                  <FormattedMessage
                    id="xpack.idxMgmt.templateDetails.summaryTab.dataStreamDescriptionListTitle"
                    defaultMessage="Data stream"
                  />
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {hasDatastream ? i18nTexts.yes : i18nTexts.no}
                </EuiDescriptionListDescription>
              </>
            )}

            {/* Version */}
            <EuiDescriptionListTitle>
              <FormattedMessage
                id="xpack.idxMgmt.templateDetails.summaryTab.versionDescriptionListTitle"
                defaultMessage="Version"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              {version || version === 0 ? version : i18nTexts.none}
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiDescriptionList textStyle="reverse">
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
    </>
  );
};
