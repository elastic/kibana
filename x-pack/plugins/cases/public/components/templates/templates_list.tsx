/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiBadge,
  useEuiTheme,
} from '@elastic/eui';
import type { CasesConfigurationUITemplate } from '../../../common/ui';

export interface Props {
  templates: CasesConfigurationUITemplate[];
}

const TemplatesListComponent: React.FC<Props> = (props) => {
  const { templates } = props;
  const { euiTheme } = useEuiTheme();

  return templates.length ? (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexStart" data-test-subj="templates-list">
        <EuiFlexItem>
          {templates.map((template) => (
            <React.Fragment key={template.key}>
              <EuiPanel
                paddingSize="s"
                data-test-subj={`template-${template.key}`}
                hasShadow={false}
              >
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={true}>
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiText>
                          <h4>{template.name}</h4>
                        </EuiText>
                      </EuiFlexItem>
                      {template.tags?.length
                        ? template.tags.map((tag, index) => (
                            <EuiBadge
                              key={`${template.key}-tag-${index}`}
                              data-test-subj={`${template.key}-tag-${index}`}
                              color={euiTheme.colors.body}
                            >
                              {tag}
                            </EuiBadge>
                          ))
                        : null}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  ) : null;
};

TemplatesListComponent.displayName = 'TemplatesList';

export const TemplatesList = React.memo(TemplatesListComponent);
