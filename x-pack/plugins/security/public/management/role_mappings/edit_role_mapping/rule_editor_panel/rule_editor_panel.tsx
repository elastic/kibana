/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiConfirmModal,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { Component, Fragment } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { DocLinksStart } from 'src/core/public';

import type { RoleMapping } from '../../../../../common/model';
import type { Rule } from '../../model';
import { generateRulesFromRaw } from '../../model';
import { VISUAL_MAX_RULE_DEPTH } from '../services/role_mapping_constants';
import { validateRoleMappingRules } from '../services/role_mapping_validation';
import { JSONRuleEditor } from './json_rule_editor';
import { VisualRuleEditor } from './visual_rule_editor';

interface Props {
  rawRules: RoleMapping['rules'];
  onChange: (rawRules: RoleMapping['rules']) => void;
  onValidityChange: (isValid: boolean) => void;
  validateForm: boolean;
  docLinks: DocLinksStart;
}

interface State {
  rules: Rule | null;
  maxDepth: number;
  isRuleValid: boolean;
  showConfirmModeChange: boolean;
  showVisualEditorDisabledAlert: boolean;
  mode: 'visual' | 'json';
}

export class RuleEditorPanel extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      ...this.initializeFromRawRules(props.rawRules),
      isRuleValid: true,
      showConfirmModeChange: false,
      showVisualEditorDisabledAlert: false,
    };
  }

  public render() {
    const validationResult =
      this.props.validateForm &&
      validateRoleMappingRules({ rules: this.state.rules ? this.state.rules.toRaw() : {} });

    let validationWarning = null;
    if (validationResult && validationResult.error) {
      validationWarning = (
        <Fragment>
          <EuiCallOut color="danger" title={validationResult.error} size="s" />
        </Fragment>
      );
    }

    return (
      <EuiPanel hasShadow={false} hasBorder={true}>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.security.management.editRoleMapping.mappingRulesPanelTitle"
              defaultMessage="Mapping rules"
            />
          </h2>
        </EuiTitle>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.security.management.editRoleMapping.roleMappingRulesFormRowHelpText"
                  defaultMessage="Assign roles to users who match these rules. {learnMoreLink}"
                  values={{
                    learnMoreLink: (
                      <EuiLink
                        href={this.props.docLinks.links.security.mappingRolesFieldRules}
                        target="_blank"
                        external={true}
                      >
                        <FormattedMessage
                          id="xpack.security.management.editRoleMapping.fieldRuleEditor.fieldValueHelp"
                          defaultMessage="Learn about supported field values."
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow fullWidth isInvalid={validationResult && validationResult.isInvalid}>
              <EuiErrorBoundary>
                <Fragment>
                  {validationWarning}
                  {this.getEditor()}
                  <EuiSpacer size="xl" />
                  {this.getModeToggle()}
                  {this.getConfirmModeChangePrompt()}
                </Fragment>
              </EuiErrorBoundary>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  private initializeFromRawRules = (rawRules: Props['rawRules']) => {
    const { rules, maxDepth } = generateRulesFromRaw(rawRules);
    const mode: State['mode'] = maxDepth >= VISUAL_MAX_RULE_DEPTH ? 'json' : 'visual';
    return {
      rules,
      mode,
      maxDepth,
    };
  };

  private getModeToggle() {
    if (this.state.mode === 'json' && this.state.maxDepth > VISUAL_MAX_RULE_DEPTH) {
      return (
        <EuiCallOut
          size="s"
          title={i18n.translate(
            'xpack.security.management.editRoleMapping.visualEditorUnavailableTitle',
            { defaultMessage: 'Visual editor unavailable' }
          )}
        >
          <FormattedMessage
            id="xpack.security.management.editRoleMapping.visualEditorUnavailableMessage"
            defaultMessage="Rule definition is too complex for the visual editor."
          />
        </EuiCallOut>
      );
    }

    // Don't offer swith if no rules are present yet
    if (this.state.mode === 'visual' && this.state.rules === null) {
      return null;
    }

    switch (this.state.mode) {
      case 'visual':
        return (
          <EuiLink
            data-test-subj="roleMappingsJSONRuleEditorButton"
            onClick={() => {
              this.trySwitchEditorMode('json');
            }}
          >
            <Fragment>
              <FormattedMessage
                id="xpack.security.management.editRoleMapping.switchToJSONEditorLink"
                defaultMessage="Switch to JSON editor"
              />{' '}
              <EuiIcon type="inputOutput" size="s" />
            </Fragment>
          </EuiLink>
        );
      case 'json':
        return (
          <EuiLink
            data-test-subj="roleMappingsVisualRuleEditorButton"
            onClick={() => {
              this.trySwitchEditorMode('visual');
            }}
          >
            <Fragment>
              <FormattedMessage
                id="xpack.security.management.editRoleMapping.switchToVisualEditorLink"
                defaultMessage="Switch to visual editor"
              />{' '}
              <EuiIcon type="inputOutput" size="s" />
            </Fragment>
          </EuiLink>
        );
      default:
        throw new Error(`Unexpected rule editor mode: ${this.state.mode}`);
    }
  }

  private getEditor() {
    switch (this.state.mode) {
      case 'visual':
        return (
          <VisualRuleEditor
            rules={this.state.rules}
            maxDepth={this.state.maxDepth}
            onChange={this.onRuleChange}
            onSwitchEditorMode={() => this.trySwitchEditorMode('json')}
          />
        );
      case 'json':
        return (
          <JSONRuleEditor
            rules={this.state.rules}
            onChange={this.onRuleChange}
            onValidityChange={this.onValidityChange}
          />
        );
      default:
        throw new Error(`Unexpected rule editor mode: ${this.state.mode}`);
    }
  }

  private getConfirmModeChangePrompt = () => {
    if (!this.state.showConfirmModeChange) {
      return null;
    }
    return (
      <EuiConfirmModal
        title={
          <FormattedMessage
            id="xpack.security.management.editRoleMapping.confirmModeChangePromptTitle"
            defaultMessage="Switch with invalid rules?"
          />
        }
        onCancel={() => this.setState({ showConfirmModeChange: false })}
        onConfirm={() => {
          this.setState({ mode: 'visual', showConfirmModeChange: false });
          this.onValidityChange(true);
        }}
        cancelButtonText={
          <FormattedMessage
            id="xpack.security.management.editRoleMapping.confirmModeChangePromptCancelButton"
            defaultMessage="Cancel"
          />
        }
        confirmButtonText={
          <FormattedMessage
            id="xpack.security.management.editRoleMapping.confirmModeChangePromptConfirmButton"
            defaultMessage="Switch anyway"
          />
        }
      >
        <p>
          <FormattedMessage
            id="xpack.security.management.editRoleMapping.confirmModeChangePromptBody"
            defaultMessage="The rules defined are not valid, and cannot be translated to the visual editor. You may lose some or all of your changes during the conversion. Do you wish to continue?"
          />
        </p>
      </EuiConfirmModal>
    );
  };

  private onRuleChange = (updatedRule: Rule | null) => {
    const raw = updatedRule ? updatedRule.toRaw() : {};
    this.props.onChange(raw);
    this.setState({
      ...generateRulesFromRaw(raw),
    });
  };

  private onValidityChange = (isRuleValid: boolean) => {
    this.setState({ isRuleValid });
    this.props.onValidityChange(isRuleValid);
  };

  private trySwitchEditorMode = (newMode: State['mode']) => {
    switch (newMode) {
      case 'visual': {
        if (this.state.isRuleValid) {
          this.setState({ mode: newMode });
          this.onValidityChange(true);
        } else {
          this.setState({ showConfirmModeChange: true });
        }
        break;
      }
      case 'json':
        this.setState({ mode: newMode });
        this.onValidityChange(true);
        break;
      default:
        throw new Error(`Unexpected rule editor mode: ${this.state.mode}`);
    }
  };
}
