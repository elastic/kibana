/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import React from 'react';
import { ISection } from '../../../typings/section';

interface Props {
  section: ISection;
}

export const EmptySection = ({ section }: Props) => {
  return (
    <EuiEmptyPrompt
      style={{ maxWidth: 'none' }}
      iconType={section.icon}
      iconColor="default"
      title={<h2>{section.title}</h2>}
      titleSize="xs"
      body={<EuiText color="default">{section.description}</EuiText>}
      actions={
        <>
          {section.linkTitle && (
            <EuiButton
              size="s"
              color="primary"
              fill
              href={section.href}
              target={section.target}
              data-test-subj={`empty-${section.id}`}
            >
              {section.linkTitle}
            </EuiButton>
          )}
        </>
      }
    />
  );
};
