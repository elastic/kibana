/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiBadge,
  EuiDescriptionList,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import moment from 'moment';
import type { EuiDescriptionListProps, EuiAccordionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CDR_MISCONFIGURATIONS_INDEX_PATTERN,
  CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX,
} from '@kbn/cloud-security-posture-common';
import { FormattedMessage } from '@kbn/i18n-react';
import { isEmpty } from 'lodash';
import type { CspFinding } from '@kbn/cloud-security-posture-common';
import { useDataView } from '@kbn/cloud-security-posture/src/hooks/use_data_view';
import { getDatasetDisplayName } from '../../../common/utils/get_dataset_display_name';
import { truthy } from '../../../../common/utils/helpers';
import { CSP_MOMENT_FORMAT } from '../../../common/constants';
import { INTERNAL_FEATURE_FLAGS } from '../../../../common/constants';
import { useKibana } from '../../../common/hooks/use_kibana';
import {
  BenchmarkIcons,
  CodeBlock,
  CspFlyoutMarkdown,
  EMPTY_VALUE,
  RuleNameLink,
} from './findings_flyout';
import { FindingsDetectionRuleCounter } from './findings_detection_rule_counter';

type Accordion = Pick<EuiAccordionProps, 'title' | 'id' | 'initialIsOpen'> &
  Pick<EuiDescriptionListProps, 'listItems'>;

const getDetailsList = (
  data: CspFinding,
  ruleFlyoutLink?: string,
  discoverDataViewLink?: string
) => [
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.ruleNameTitle', {
      defaultMessage: 'Rule Name',
    }),
    description: data.rule?.name ? (
      <RuleNameLink ruleFlyoutLink={ruleFlyoutLink} ruleName={data.rule.name} />
    ) : (
      EMPTY_VALUE
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.alertsTitle', {
      defaultMessage: 'Alerts',
    }),
    description: <FindingsDetectionRuleCounter finding={data} />,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.ruleTagsTitle', {
      defaultMessage: 'Rule Tags',
    }),
    description: data.rule?.tags?.length ? (
      <>
        {data.rule.tags.map((tag) => (
          <EuiBadge key={tag}>{tag}</EuiBadge>
        ))}
      </>
    ) : (
      EMPTY_VALUE
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.evaluatedAtTitle', {
      defaultMessage: 'Evaluated at',
    }),
    description: data['@timestamp']
      ? moment(data['@timestamp']).format(CSP_MOMENT_FORMAT)
      : EMPTY_VALUE,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.frameworkSourcesTitle', {
      defaultMessage: 'Framework Sources',
    }),
    description:
      data.rule?.benchmark?.id && data.rule?.benchmark?.name ? (
        <BenchmarkIcons
          benchmarkId={data.rule?.benchmark?.id}
          benchmarkName={data.rule?.benchmark?.name}
        />
      ) : (
        EMPTY_VALUE
      ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.cisSectionTitle', {
      defaultMessage: 'Framework Section',
    }),
    description: data.rule?.section ? data.rule?.section : EMPTY_VALUE,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.sourceTitle', {
      defaultMessage: 'Source',
    }),
    description:
      getDatasetDisplayName(data.data_stream?.dataset) || data.data_stream?.dataset || EMPTY_VALUE,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.dataViewTitle', {
      defaultMessage: 'Data View',
    }),
    description: discoverDataViewLink ? (
      <EuiLink href={discoverDataViewLink}>{CDR_MISCONFIGURATIONS_INDEX_PATTERN}</EuiLink>
    ) : (
      CDR_MISCONFIGURATIONS_INDEX_PATTERN
    ),
  },
];

export const getRemediationList = (rule: CspFinding['rule']) => [
  {
    title: '',
    description: rule?.remediation ? (
      <CspFlyoutMarkdown>{rule?.remediation}</CspFlyoutMarkdown>
    ) : (
      EMPTY_VALUE
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.impactTitle', {
      defaultMessage: 'Impact',
    }),
    description: rule?.impact ? <CspFlyoutMarkdown>{rule.impact}</CspFlyoutMarkdown> : EMPTY_VALUE,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.defaultValueTitle', {
      defaultMessage: 'Default Value',
    }),
    description: rule?.default_value ? (
      <CspFlyoutMarkdown>{rule.default_value}</CspFlyoutMarkdown>
    ) : (
      EMPTY_VALUE
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.rationaleTitle', {
      defaultMessage: 'Rationale',
    }),
    description: rule?.rationale ? (
      <CspFlyoutMarkdown>{rule.rationale}</CspFlyoutMarkdown>
    ) : (
      EMPTY_VALUE
    ),
  },
];

const getEvidenceList = ({ result }: CspFinding) =>
  [
    {
      title: '',
      description: (
        <>
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.csp.findings.findingsFlyout.overviewTab.evidenceDescription"
              defaultMessage="The specific resource metadata that was evaluated to generate this posture finding"
            />
          </EuiText>
          <EuiSpacer size={'s'} />
          <CodeBlock language="json">{JSON.stringify(result?.evidence, null, 2)}</CodeBlock>
        </>
      ),
    },
  ].filter(truthy);

export const OverviewTab = ({
  data,
  ruleFlyoutLink,
}: {
  data: CspFinding;
  ruleFlyoutLink?: string;
}) => {
  const { discover } = useKibana().services;
  const cdrMisconfigurationsDataView = useDataView(CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX);

  // link will navigate to our dataview in discover, filtered by the data source of the finding
  const discoverDataViewLink = useMemo(
    () =>
      discover.locator?.getRedirectUrl({
        dataViewId: cdrMisconfigurationsDataView.data?.id,
        ...(data.data_stream?.dataset && {
          filters: [
            {
              meta: {
                type: 'phrase',
                key: 'data_stream.dataset',
              },
              query: {
                match_phrase: {
                  'data_stream.dataset': data.data_stream.dataset,
                },
              },
            },
          ],
        }),
      }),
    [data.data_stream?.dataset, discover.locator, cdrMisconfigurationsDataView.data?.id]
  );

  const hasEvidence = !isEmpty(data.result?.evidence);

  const accordions: Accordion[] = useMemo(
    () =>
      [
        {
          initialIsOpen: true,
          title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.detailsTitle', {
            defaultMessage: 'Details',
          }),
          id: 'detailsAccordion',
          listItems: getDetailsList(data, ruleFlyoutLink, discoverDataViewLink),
        },
        {
          initialIsOpen: true,
          title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.remediationTitle', {
            defaultMessage: 'Remediation',
          }),
          id: 'remediationAccordion',
          listItems: getRemediationList(data.rule),
        },
        INTERNAL_FEATURE_FLAGS.showFindingFlyoutEvidence &&
          hasEvidence && {
            initialIsOpen: true,
            title: i18n.translate(
              'xpack.csp.findings.findingsFlyout.overviewTab.evidenceSourcesTitle',
              { defaultMessage: 'Evidence' }
            ),
            id: 'evidenceAccordion',
            listItems: getEvidenceList(data),
          },
      ].filter(truthy),
    [data, discoverDataViewLink, hasEvidence, ruleFlyoutLink]
  );

  return (
    <>
      {accordions.map((accordion) => (
        <React.Fragment key={accordion.id}>
          <EuiPanel hasShadow={false} hasBorder>
            <EuiAccordion
              id={accordion.id}
              buttonContent={
                <EuiText>
                  <strong>{accordion.title}</strong>
                </EuiText>
              }
              arrowDisplay="left"
              initialIsOpen={accordion.initialIsOpen}
            >
              <EuiSpacer size="m" />
              <EuiDescriptionList listItems={accordion.listItems} />
            </EuiAccordion>
          </EuiPanel>
          <EuiSpacer size="m" />
        </React.Fragment>
      ))}
    </>
  );
};
