/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiDescriptionList, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import moment from 'moment';
import type { EuiDescriptionListProps, EuiAccordionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CspFinding } from '../types';
import { CisKubernetesIcons, Markdown, CodeBlock } from './findings_flyout';

type Accordion = Pick<EuiAccordionProps, 'title' | 'id' | 'initialIsOpen'> &
  Pick<EuiDescriptionListProps, 'listItems'>;

const getDetailsList = (data: CspFinding) => [
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.ruleNameTitle', {
      defaultMessage: 'Rule Name',
    }),
    description: data.rule.name,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.evaluatedAtTitle', {
      defaultMessage: 'Evaluated at',
    }),
    description: moment(data['@timestamp']).format('MMMM D, YYYY @ HH:mm:ss.SSS'),
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
    description: <CisKubernetesIcons />,
  },
  {
    title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.cisSectionTitle', {
      defaultMessage: 'CIS Section',
    }),
    description: data.rule.section,
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
  ].filter(Boolean) as EuiDescriptionListProps['listItems'];

export const OverviewTab = ({ data }: { data: CspFinding }) => {
  const accordions: Accordion[] = useMemo(
    () => [
      {
        initialIsOpen: true,
        title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.detailsTitle', {
          defaultMessage: 'Details',
        }),
        id: 'detailsAccordion',
        listItems: getDetailsList(data),
      },
      {
        initialIsOpen: true,
        title: i18n.translate('xpack.csp.findings.findingsFlyout.overviewTab.remediationTitle', {
          defaultMessage: 'Remediation',
        }),
        id: 'remediationAccordion',
        listItems: getRemediationList(data.rule),
      },
      {
        initialIsOpen: false,
        title: i18n.translate(
          'xpack.csp.findings.findingsFlyout.overviewTab.evidenceSourcesTitle',
          { defaultMessage: 'Evidence' }
        ),
        id: 'evidenceAccordion',
        listItems: getEvidenceList(data),
      },
    ],
    [data]
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
