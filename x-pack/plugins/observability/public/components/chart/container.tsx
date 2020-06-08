/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiAccordion, EuiHorizontalRule, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

interface Props {
  title: string;
  children: React.ReactNode;
}

const Container = styled.div`
  .accordion-button {
    width: 100%;
  }
`;

export const ChartContainer = ({ title, children }: Props) => {
  return (
    <Container>
      <EuiAccordion
        initialIsOpen
        id={title}
        buttonContentClassName="accordion-button"
        buttonContent={
          <>
            <EuiTitle size="xs">
              <h5>{title}</h5>
            </EuiTitle>
            <EuiHorizontalRule margin="xs" />
          </>
        }
      >
        <EuiSpacer size="s" />
        <EuiPanel style={{ height: '296px' }}>{children}</EuiPanel>
      </EuiAccordion>
    </Container>
  );
};
