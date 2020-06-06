/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useContext } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
import { ThemeContext } from 'styled-components';
import { EuiText } from '@elastic/eui';
import { ISection } from '../../pages/home/section';

interface Props {
  section: ISection;
}

export const EmptySection = ({ section }: Props) => {
  const theme = useContext(ThemeContext);
  return (
    <EuiEmptyPrompt
      style={{ border: `1px dashed ${theme.eui.euiBorderColor}`, borderRadius: '4px' }}
      iconType="dataVisualizer"
      iconColor="default"
      title={<h2>{section.title}</h2>}
      titleSize="xs"
      body={<EuiText color="default">{section.description}</EuiText>}
      actions={
        <>
          {section.linkTitle && (
            <EuiButton size="s" color="primary" fill href={section.href} target={section.target}>
              {section.linkTitle}
            </EuiButton>
          )}
        </>
      }
    />
  );
};
