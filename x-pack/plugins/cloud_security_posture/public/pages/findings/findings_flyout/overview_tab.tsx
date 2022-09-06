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
import * as TEXT from '../translations';
import { CspFinding } from '../types';
import { CisKubernetesIcons, Markdown, CodeBlock } from './findings_flyout';

type Accordion = Pick<EuiAccordionProps, 'title' | 'id' | 'initialIsOpen'> &
  Pick<EuiDescriptionListProps, 'listItems'>;

const getDetailsList = (data: CspFinding) => [
  {
    title: TEXT.RULE_NAME,
    description: data.rule.name,
  },
  {
    title: TEXT.EVALUATED_AT,
    description: moment(data['@timestamp']).format('MMMM D, YYYY @ HH:mm:ss.SSS'),
  },
  {
    title: TEXT.RESOURCE_NAME,
    description: data.resource.name,
  },
  {
    title: TEXT.FRAMEWORK_SOURCES,
    description: <CisKubernetesIcons />,
  },
  {
    title: TEXT.CIS_SECTION,
    description: data.rule.section,
  },
];

export const getRemediationList = (rule: CspFinding['rule']) => [
  {
    title: '',
    description: <Markdown>{rule.remediation}</Markdown>,
  },
  {
    title: TEXT.IMPACT,
    description: <Markdown>{rule.impact}</Markdown>,
  },
  {
    title: TEXT.DEFAULT_VALUE,
    description: <Markdown>{rule.default_value}</Markdown>,
  },
  {
    title: TEXT.RATIONALE,
    description: <Markdown>{rule.rationale}</Markdown>,
  },
];

const getEvidenceList = ({ result }: CspFinding) =>
  [
    result.expected && {
      title: TEXT.EXPECTED,
      description: <CodeBlock>{JSON.stringify(result.expected, null, 2)}</CodeBlock>,
    },
    {
      title: TEXT.ACTUAL,
      description: <CodeBlock>{JSON.stringify(result.evidence, null, 2)}</CodeBlock>,
    },
  ].filter(Boolean) as EuiDescriptionListProps['listItems'];

export const OverviewTab = ({ data }: { data: CspFinding }) => {
  const accordions: Accordion[] = useMemo(
    () => [
      {
        initialIsOpen: true,
        title: TEXT.DETAILS,
        id: 'detailsAccordion',
        listItems: getDetailsList(data),
      },
      {
        initialIsOpen: true,
        title: TEXT.REMEDIATION,
        id: 'remediationAccordion',
        listItems: getRemediationList(data.rule),
      },
      {
        initialIsOpen: false,
        title: TEXT.EVIDENCE,
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
