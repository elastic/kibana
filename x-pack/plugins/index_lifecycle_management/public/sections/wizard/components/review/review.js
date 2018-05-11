/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { toastNotifications } from 'ui/notify';

// import DiffEditor from 'react-ace/lib/diff';
import './review.less';

import 'brace/theme/github';
import 'brace/mode/json';
import 'brace/snippets/json';
import 'brace/ext/language_tools';

import {
  EuiTitle,
  EuiSpacer,
  EuiHorizontalRule,
  EuiButton,
  EuiFlexItem,
  EuiFlexGrid,
  EuiPanel,
  EuiText,
  EuiButtonEmpty,
  EuiFormRow,
  EuiSwitch,
  EuiFieldText,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { getAffectedIndices } from '../../../../api';
import { DiffView } from './diff_view';
import { ErrableFormRow } from '../../form_errors';
import { STRUCTURE_POLICY_NAME } from '../../../../store/constants';
import { hasErrors } from '../../../../lib/find_errors';

export class Review extends Component {
  static propTypes = {
    setSelectedPolicyName: PropTypes.func.isRequired,
    setSaveAsNewPolicy: PropTypes.func.isRequired,
    done: PropTypes.func.isRequired,
    back: PropTypes.func.isRequired,

    selectedIndexTemplateName: PropTypes.string.isRequired,
    affectedIndexTemplates: PropTypes.array.isRequired,
    templateDiff: PropTypes.object.isRequired,
    lifecycle: PropTypes.object.isRequired,
    selectedPolicyName: PropTypes.string.isRequired,
    saveAsNewPolicy: PropTypes.bool.isRequired,
    originalPolicyName: PropTypes.string,
    bootstrapEnabled: PropTypes.bool.isRequired,
    aliasName: PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedTab: 1,
      affectedIndices: [],
      isLoadingAffectedIndices: false,
    };

    this.currentFetchTimeout = null;
  }

  fetchAffectedIndices = () => {
    if (this.currentFetchTimeout) {
      clearTimeout(this.currentFetchTimeout);
    }

    this.setState({ isLoadingAffectedIndices: true });
    this.currentFetchTimeout = setTimeout(async () => {
      const affectedIndices = await getAffectedIndices(
        this.props.selectedIndexTemplateName,
        this.props.selectedPolicyName
      );
      this.setState({ affectedIndices, isLoadingAffectedIndices: false });
    }, 500);
  }

  async componentWillMount() {
    this.fetchAffectedIndices();
  }

  async componentWillReceiveProps(nextProps) {
    if (nextProps.selectedPolicyName !== this.props.selectedPolicyName) {
      this.fetchAffectedIndices();
    }
  }

  validate = async () => {
    await this.props.validate();
    const noErrors = !hasErrors(this.props.errors);
    return noErrors;
  };

  submit = async () => {
    this.setState({ isShowingErrors: true });
    if (await this.validate()) {
      this.props.done();
    } else {
      toastNotifications.addDanger('Please fix errors on the page.');
    }
  };

  render() {
    const {
      done,
      back,

      /* Start might move */
      setSelectedPolicyName,
      setSaveAsNewPolicy,
      validate,

      errors,
      selectedPolicyName,
      saveAsNewPolicy,
      originalPolicyName,
      /* End might move */

      selectedIndexTemplateName,
      affectedIndexTemplates,
      templateDiff,
      lifecycle,
      bootstrapEnabled,
      aliasName,
    } = this.props;

    const { affectedIndices, isLoadingAffectedIndices, isShowingErrors } = this.state;

    // console.log('render', affectedIndices);

    return (
      <div className="euiAnimateContentLoad">
        {/* <EuiTitle>
          <h4>Changes that will occur</h4>
        </EuiTitle>
        <EuiSpacer /> */}
        <EuiSpacer />

        <Fragment>
          {originalPolicyName ? (
            <EuiFormRow label="Policy options" style={{ maxWidth: '100%' }}>
              <EuiSwitch
                style={{ maxWidth: '100%' }}
                checked={saveAsNewPolicy}
                onChange={async e => {
                  await setSaveAsNewPolicy(e.target.checked);
                  validate();
                }}
                label={
                  <span>
                    Save this <strong>as a new policy</strong> so it does not
                    effect other templates.
                  </span>
                }
              />
            </EuiFormRow>
          ) : null}
          {saveAsNewPolicy ? (
            <ErrableFormRow
              label="Policy name"
              errorKey={STRUCTURE_POLICY_NAME}
              isShowingErrors={isShowingErrors}
              errors={errors}
            >
              <EuiFieldText
                value={selectedPolicyName}
                onChange={async e => {
                  await setSelectedPolicyName(e.target.value);
                  validate();
                }}
              />
            </ErrableFormRow>
          ) : null}
        </Fragment>
        <EuiSpacer size="m"/>
        <EuiFlexGrid columns={bootstrapEnabled ? 3 : 2}>
          <EuiFlexItem>
            <EuiPanel>
              <EuiTitle size="l" style={{ textAlign: 'center' }}>
                <p>{affectedIndexTemplates.length} Affected Index {affectedIndexTemplates.length === 1 ? 'Template' : 'Templates' }</p>
              </EuiTitle>
              <EuiText size="s">
                <ul>
                  {affectedIndexTemplates.map(template => (
                    <li key={template}>{template}</li>
                  ))}
                </ul>
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel>
              <EuiTitle size="l" style={{ textAlign: 'center' }}>
                <p>{affectedIndices.length} Affected {affectedIndices.length === 1 ? 'Index' : 'Indices' }</p>
              </EuiTitle>
              <EuiText size="s">
                { isLoadingAffectedIndices ? (
                  <EuiLoadingSpinner size="l"/>
                ) : (
                  <ul>
                    {affectedIndices.map(index => <li key={index}>{index}</li>)}
                  </ul>
                ) }
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
          {bootstrapEnabled ? (
            <EuiFlexItem>
              <EuiPanel>
                <EuiTitle size="l" style={{ textAlign: 'center' }}>
                  <p>New alias</p>
                </EuiTitle>
                <EuiText size="s">
                  <p>Point to this new alias going forward:</p>
                  <ul>
                    <li>{aliasName}</li>
                  </ul>
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGrid>
        <EuiHorizontalRule className="ilmHrule" />
        {templateDiff.hasChanged ? (
          <Fragment>
            <EuiTitle>
              <h4>
                We will be changing the index template named `{
                  selectedIndexTemplateName
                }`
              </h4>
            </EuiTitle>
            <EuiSpacer size="m" />
            <DiffView
              templateDiff={templateDiff}
            />
            {/* <DiffEditor
              editorProps={{
                $blockScrolling: Infinity,
                autoScrollEditorIntoView: false,
              }}
              value={[
                JSON.stringify(templateDiff.originalFullIndexTemplate, null, 2),
                JSON.stringify(templateDiff.newFullIndexTemplate, null, 2),
              ]}
              readOnly={true}
              height="300px"
              width="100%"
              mode="json"
            /> */}

            <EuiHorizontalRule className="ilmHrule" />
          </Fragment>
        ) : null}
        <EuiButtonEmpty iconSide="left" iconType="sortLeft" onClick={back}>
          Back
        </EuiButtonEmpty>
        &nbsp;&nbsp;
        <EuiButton
          fill
          color="secondary"
          iconType="check"
          onClick={() => done(lifecycle)}
        >
          Looks good, save changes
        </EuiButton>
      </div>
    );
  }
}
