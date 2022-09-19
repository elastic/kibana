/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiCode,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { getFlattenedObject } from '@kbn/std';
import { i18n } from '@kbn/i18n';
import { CspFinding } from '../../../../common/schemas/csp_finding';

const getDescriptionDisplay = (value: unknown) => {
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean' || value === null) {
    return <EuiCode>{JSON.stringify(value)}</EuiCode>;
  }

  if (typeof value === 'object') {
    return (
      <EuiCodeBlock isCopyable={true} overflowHeight={300}>
        {JSON.stringify(value, null, 2)}
      </EuiCodeBlock>
    );
  }

  return <EuiText size="s">{value as string}</EuiText>;
};

export const prepareDescriptionList = (data: any) =>
  Object.entries(getFlattenedObject(data))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => ({
      title: (
        <EuiText size="s">
          <strong>{key}</strong>
        </EuiText>
      ),
      description: getDescriptionDisplay(value),
    }));

export const ResourceTab = ({ data }: { data: CspFinding }) => {
  const { euiTheme } = useEuiTheme();

  const accordions = useMemo(
    () => [
      {
        title: i18n.translate(
          'xpack.csp.findings.findingsFlyout.resourceTab.resourceAccordionTitle',
          { defaultMessage: 'Resource' }
        ),
        id: 'resourceAccordion',
        listItems: prepareDescriptionList(data.resource),
      },
      {
        title: i18n.translate('xpack.csp.findings.findingsFlyout.resourceTab.hostAccordionTitle', {
          defaultMessage: 'Host',
        }),
        id: 'hostAccordion',
        listItems: prepareDescriptionList(data.host),
      },
    ],
    [data.host, data.resource]
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
              initialIsOpen
            >
              <EuiDescriptionList
                listItems={accordion.listItems}
                type="column"
                style={{
                  marginTop: euiTheme.size.l,
                }}
                titleProps={{ style: { width: '35%' } }}
                descriptionProps={{ style: { width: '65%' } }}
              />
            </EuiAccordion>
          </EuiPanel>
          <EuiSpacer size="m" />
        </React.Fragment>
      ))}
    </>
  );
};
