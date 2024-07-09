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
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import moment from 'moment';
import type { EuiDescriptionListProps, EuiAccordionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isEmpty } from 'lodash';
import { truthy } from '../../../../common/utils/helpers';
import { CSP_MOMENT_FORMAT } from '../../../common/constants';
import {
  INTERNAL_FEATURE_FLAGS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_PATTERN,
} from '../../../../common/constants';
import { useDataView } from '../../../common/api/use_data_view';
import { useKibana } from '../../../common/hooks/use_kibana';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { CisKubernetesIcons, CodeBlock, CspFlyoutMarkdown } from './findings_flyout';
import { FindingsDetectionRuleCounter } from './findings_detection_rule_counter';

type Accordion = Pick<EuiAccordionProps, 'title' | 'id' | 'initialIsOpen'> &
  Pick<EuiDescriptionListProps, 'listItems'>;

const getDetailsList = (data: CspFinding, ruleFlyoutLink: string, discoverIndexLink?: string) => [
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.ruleNameTitle', {
      defaultMessage: 'Rule Name',
    }),
    description: data.rule?.name ? (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.ruleNameTooltip', {
          defaultMessage: 'Manage Rule',
        })}
      >
        <EuiLink href={ruleFlyoutLink}>{data.rule.name}</EuiLink>
      </EuiToolTip>
    ) : (
      '-'
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
      '-'
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.evaluatedAtTitle', {
      defaultMessage: 'Evaluated at',
    }),
    description: data['@timestamp'] ? moment(data['@timestamp']).format(CSP_MOMENT_FORMAT) : '-',
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.frameworkSourcesTitle', {
      defaultMessage: 'Framework Sources',
    }),
    description:
      data.rule?.benchmark?.id && data.rule?.benchmark?.name ? (
        <CisKubernetesIcons
          benchmarkId={data.rule?.benchmark?.id}
          benchmarkName={data.rule?.benchmark?.name}
        />
      ) : (
        '-'
      ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.cisSectionTitle', {
      defaultMessage: 'Framework Section',
    }),
    description: data.rule?.section ? data.rule?.section : '-',
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.indexTitle', {
      defaultMessage: 'Index',
    }),
    description: discoverIndexLink ? (
      // TODO: find a way to get index name
      <EuiLink href={discoverIndexLink}>{LATEST_FINDINGS_INDEX_DEFAULT_NS}</EuiLink>
    ) : (
      LATEST_FINDINGS_INDEX_DEFAULT_NS
    ),
  },
];

export const getRemediationList = (rule: CspFinding['rule']) => [
  {
    title: '',
    description: <CspFlyoutMarkdown>{rule?.remediation}</CspFlyoutMarkdown>,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.impactTitle', {
      defaultMessage: 'Impact',
    }),
    description: rule?.impact ? <CspFlyoutMarkdown>{rule.impact}</CspFlyoutMarkdown> : '-',
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.defaultValueTitle', {
      defaultMessage: 'Default Value',
    }),
    description: rule?.default_value ? (
      <CspFlyoutMarkdown>{rule.default_value}</CspFlyoutMarkdown>
    ) : (
      '-'
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.rationaleTitle', {
      defaultMessage: 'Rationale',
    }),
    description: rule?.rationale ? <CspFlyoutMarkdown>{rule.rationale}</CspFlyoutMarkdown> : '-',
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
  ruleFlyoutLink: string;
}) => {
  const { discover } = useKibana().services;
  const latestFindingsDataView = useDataView(LATEST_FINDINGS_INDEX_PATTERN);

  const discoverIndexLink = useMemo(
    () =>
      discover.locator?.getRedirectUrl({
        indexPatternId: latestFindingsDataView.data?.id,
      }),
    [discover.locator, latestFindingsDataView.data?.id]
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
          listItems: getDetailsList(data, ruleFlyoutLink, discoverIndexLink),
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
    [data, discoverIndexLink, hasEvidence, ruleFlyoutLink]
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
