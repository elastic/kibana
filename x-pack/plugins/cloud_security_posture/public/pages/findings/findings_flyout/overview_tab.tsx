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
import { truthy } from '../../../../common/utils/helpers';
import { CSP_MOMENT_FORMAT } from '../../../common/constants';
import {
  INTERNAL_FEATURE_FLAGS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '../../../../common/constants';
import { useLatestFindingsDataView } from '../../../common/api/use_latest_findings_data_view';
import { useKibana } from '../../../common/hooks/use_kibana';
import { CspFinding } from '../../../../common/schemas/csp_finding';
import { CisKubernetesIcons, Markdown, CodeBlock } from './findings_flyout';

type Accordion = Pick<EuiAccordionProps, 'title' | 'id' | 'initialIsOpen'> &
  Pick<EuiDescriptionListProps, 'listItems'>;

const getDetailsList = (data: CspFinding, discoverIndexLink: string | undefined) => [
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.ruleNameTitle', {
      defaultMessage: 'Rule Name',
    }),
    description: data.rule.name,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.ruleTagsTitle', {
      defaultMessage: 'Rule Tags',
    }),
    description: (
      <>
        {data.rule.tags.map((tag) => (
          <EuiBadge>{tag}</EuiBadge>
        ))}
      </>
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.evaluatedAtTitle', {
      defaultMessage: 'Evaluated at',
    }),
    description: moment(data['@timestamp']).format(CSP_MOMENT_FORMAT),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.resourceIdTitle', {
      defaultMessage: 'Resource ID',
    }),
    description: data.resource.id,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.resourceNameTitle', {
      defaultMessage: 'Resource Name',
    }),
    description: data.resource.name,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.frameworkSourcesTitle', {
      defaultMessage: 'Framework Sources',
    }),
    description: (
      <CisKubernetesIcons
        benchmarkId={data.rule.benchmark.id}
        benchmarkName={data.rule.benchmark.name}
      />
    ),
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.cisSectionTitle', {
      defaultMessage: 'CIS Section',
    }),
    description: data.rule.section,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.indexTitle', {
      defaultMessage: 'Index',
    }),
    description: discoverIndexLink ? (
      <EuiLink href={discoverIndexLink}>{LATEST_FINDINGS_INDEX_DEFAULT_NS}</EuiLink>
    ) : (
      LATEST_FINDINGS_INDEX_DEFAULT_NS
    ),
  },
];

export const getRemediationList = (rule: CspFinding['rule']) => [
  {
    title: '',
    description: <Markdown>{rule.remediation}</Markdown>,
  },
  ...(rule.impact
    ? [
        {
          title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.impactTitle', {
            defaultMessage: 'Impact',
          }),
          description: <Markdown>{rule.impact}</Markdown>,
        },
      ]
    : []),
  ...(rule.default_value
    ? [
        {
          title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.defaultValueTitle', {
            defaultMessage: 'Default Value',
          }),
          description: <Markdown>{rule.default_value}</Markdown>,
        },
      ]
    : []),
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.rationaleTitle', {
      defaultMessage: 'Rationale',
    }),
    description: <Markdown>{rule.rationale}</Markdown>,
  },
];

const getEvidenceList = ({ result }: CspFinding) =>
  [
    result.expected && {
      title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.expectedTitle', {
        defaultMessage: 'Expected',
      }),
      description: <CodeBlock>{JSON.stringify(result.expected, null, 2)}</CodeBlock>,
    },
    {
      title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.actualTitle', {
        defaultMessage: 'Actual',
      }),
      description: <CodeBlock>{JSON.stringify(result.evidence, null, 2)}</CodeBlock>,
    },
  ].filter(truthy);

export const OverviewTab = ({ data }: { data: CspFinding }) => {
  const {
    services: { discover },
  } = useKibana();
  const latestFindingsDataView = useLatestFindingsDataView();

  const discoverIndexLink = useMemo(
    () =>
      discover.locator?.getRedirectUrl({
        indexPatternId: latestFindingsDataView.data?.id,
      }),
    [discover.locator, latestFindingsDataView.data?.id]
  );

  const accordions: Accordion[] = useMemo(
    () =>
      [
        {
          initialIsOpen: true,
          title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.detailsTitle', {
            defaultMessage: 'Details',
          }),
          id: 'detailsAccordion',
          listItems: getDetailsList(data, discoverIndexLink),
        },
        {
          initialIsOpen: true,
          title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.remediationTitle', {
            defaultMessage: 'Remediation',
          }),
          id: 'remediationAccordion',
          listItems: getRemediationList(data.rule),
        },
        INTERNAL_FEATURE_FLAGS.showFindingFlyoutEvidence && {
          initialIsOpen: false,
          title: i18n.translate(
            'xpack.csp.findings.findingsFlyout.overviewTab.evidenceSourcesTitle',
            { defaultMessage: 'Evidence' }
          ),
          id: 'evidenceAccordion',
          listItems: getEvidenceList(data),
        },
      ].filter(truthy),
    [data, discoverIndexLink]
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
