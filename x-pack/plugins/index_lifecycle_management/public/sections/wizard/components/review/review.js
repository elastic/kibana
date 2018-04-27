/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import React, { Component } from 'react';
import PropTypes from 'prop-types';

import DiffEditor from 'react-ace/lib/diff';
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
} from '@elastic/eui';
import { getAffectedIndices } from '../../../../api';

export class Review extends Component {
  static propTypes = {
    setSelectedPolicyName: PropTypes.func.isRequired,
    setSaveAsNewPolicy: PropTypes.func.isRequired,
    done: PropTypes.func.isRequired,

    selectedIndexTemplateName: PropTypes.string.isRequired,
    affectedIndexTemplates: PropTypes.array.isRequired,
    templateDiff: PropTypes.object.isRequired,
    lifecycle: PropTypes.object.isRequired,
    selectedPolicyName: PropTypes.string.isRequired,
    saveAsNewPolicy: PropTypes.bool.isRequired,
    originalPolicyName: PropTypes.string,
    bootstrapEnabled: PropTypes.bool.isRequired,
    aliasName: PropTypes.string.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedTab: 1,
      affectedIndices: []
    };
  }

  async componentWillMount() {
    const affectedIndices = await getAffectedIndices(
      this.props.selectedIndexTemplateName,
      this.props.selectedPolicyName
    );
    this.setState({ affectedIndices });
  }

  render() {
    const {
      done,

      selectedIndexTemplateName,
      affectedIndexTemplates,
      templateDiff,
      lifecycle,
      bootstrapEnabled,
      aliasName
    } = this.props;

    const { affectedIndices } = this.state;

    return (
      <div className="euiAnimateContentLoad">
        <EuiTitle>
          <h4>Changes that will occur</h4>
        </EuiTitle>
        <EuiSpacer />
        <EuiFlexGrid columns={bootstrapEnabled ? 3 : 2}>
          <EuiFlexItem>
            <EuiPanel>
              <EuiTitle size="l" style={{ textAlign: 'center' }}>
                <p>{affectedIndexTemplates.length}</p>
              </EuiTitle>
              <EuiText size="s">
                <p>
                  <strong>Index templates</strong> affected by this change (to the selected policy):
                </p>
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
                <p>{affectedIndices.length}</p>
              </EuiTitle>
              <EuiText size="s">
                <p>
                  <strong>Indices</strong> affected by this change (to the selected policy):
                </p>
                <ul>
                  {affectedIndices.map(index => <li key={index}>{index}</li>)}
                </ul>
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
                  <p>Point to these new aliases going forward:</p>
                  <ul>
                    <li>
                      <strong>READ</strong>: {aliasName}
                    </li>
                    <li>
                      <strong>WRITE</strong>: {aliasName}
                    </li>
                  </ul>
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGrid>
        <EuiHorizontalRule className="ilmHrule" />
        <EuiTitle>
          <h4>
            We will be changing the index template named `{
              selectedIndexTemplateName
            }`
          </h4>
        </EuiTitle>
        <EuiSpacer size="m" />
        <DiffEditor
          editorProps={{
            $blockScrolling: Infinity,
            autoScrollEditorIntoView: false
          }}
          value={[
            JSON.stringify(templateDiff.originalFullIndexTemplate, null, 2),
            JSON.stringify(templateDiff.newFullIndexTemplate, null, 2)
          ]}
          readOnly={true}
          height="300px"
          width="100%"
          mode="json"
        />

        <EuiHorizontalRule className="ilmHrule" />

        <EuiButton
          fill
          color="secondary"
          iconType="check"
          onClick={() => done(lifecycle)}
        >
          Looks good, make these changes
        </EuiButton>
      </div>
    );
  }
}
