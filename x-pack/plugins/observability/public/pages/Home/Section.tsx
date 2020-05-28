/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export interface ISection {
  id: string;
  title: string;
  icon: string;
  description: string;
  href?: string;
}

export const Section = ({ section }: { section: ISection }) => {
  const { id, icon, title, description, href } = section;

  const sectionContent = (
    <EuiFlexGroup gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiIcon type={icon} size="l" color="black" />
      </EuiFlexItem>
      <EuiFlexItem style={{ textAlign: 'left' }}>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate(`observability.section.${id}.title`, {
              defaultMessage: title,
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" style={{ whiteSpace: 'normal' }} color="default">
          {i18n.translate(`observability.section.${id}.description`, {
            defaultMessage: description,
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  if (href) {
    return (
      <EuiFlexItem>
        <EuiButtonEmpty href={href} style={{ height: 'auto' }}>
          {sectionContent}
        </EuiButtonEmpty>
      </EuiFlexItem>
    );
  }
  return <EuiFlexItem>{sectionContent}</EuiFlexItem>;
};
