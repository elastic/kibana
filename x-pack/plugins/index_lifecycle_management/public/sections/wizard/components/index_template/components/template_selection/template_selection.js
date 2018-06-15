/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiSelect,
  EuiFormRow,
  EuiSwitch,
  EuiFieldText,
  EuiDescribedFormGroup,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';

import { ErrableFormRow } from '../../../../form_errors';
import {
  STRUCTURE_TEMPLATE_NAME,
  STRUCTURE_INDEX_NAME,
  STRUCTURE_ALIAS_NAME,
} from '../../../../../../store/constants';

export class TemplateSelection extends Component {
  static propTypes = {
    fetchIndexTemplates: PropTypes.func.isRequired,
    setSelectedIndexTemplate: PropTypes.func.isRequired,
    validate: PropTypes.func.isRequired,

    selectedIndexTemplateName: PropTypes.string.isRequired,
    templateOptions: PropTypes.array.isRequired,
    errors: PropTypes.object.isRequired,
    isShowingErrors: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      isIncludingSystemIndices: false,
    };
  }

  componentWillMount() {
    this.props.fetchIndexTemplates();
  }

  onChangeIncludingSystemIndices = e => {
    this.setState({ isIncludingSystemIndices: e.target.checked });
  };

  render() {
    const {
      setSelectedIndexTemplate,
      validate,
      setBootstrapEnabled,
      setIndexName,
      setAliasName,

      bootstrapEnabled,
      selectedIndexTemplateIndices,
      indexName,
      aliasName,
      selectedIndexTemplateName,
      errors,
      isShowingErrors,
    } = this.props;

    const { isIncludingSystemIndices } = this.state;

    const templateOptions = this.props.templateOptions.filter(option => {
      if (option.value && option.value.startsWith('.') && !isIncludingSystemIndices) {
        return false;
      }
      return true;
    });

    return (
      <EuiDescribedFormGroup
        title={<h4>Select a template</h4>}
        fullWidth
        titleSize="s"
        description={
          <p>
            An index template defines the settings, mappings, and aliases to apply
            when you create an index.{' '}
            <EuiLink href="https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-templates.html">
              Learn more
            </EuiLink>
          </p>
        }
      >
        <EuiSwitch
          label="Include system indices"
          checked={isIncludingSystemIndices}
          onChange={this.onChangeIncludingSystemIndices}
        />
        <EuiSpacer/>
        <ErrableFormRow
          label="Your existing templates"
          errorKey={STRUCTURE_TEMPLATE_NAME}
          isShowingErrors={isShowingErrors}
          errors={errors}
        >
          <EuiSelect
            value={selectedIndexTemplateName}
            onChange={async e => {
              await setSelectedIndexTemplate(e.target.value);
              validate();
            }}
            options={templateOptions}
          />
        </ErrableFormRow>
        {selectedIndexTemplateName && selectedIndexTemplateIndices.length === 0 ? (
          <Fragment>
            <EuiFormRow label="Bootstrap options" style={{ maxWidth: '100%' }}>
              <EuiSwitch
                style={{ maxWidth: '100%' }}
                checked={bootstrapEnabled}
                onChange={e => setBootstrapEnabled(e.target.checked)}
                label={<span>Create an index and alias for this template</span>}
              />
            </EuiFormRow>
            {bootstrapEnabled ? (
              <Fragment>
                <ErrableFormRow
                  label="Index name"
                  errorKey={STRUCTURE_INDEX_NAME}
                  isShowingErrors={isShowingErrors}
                  errors={errors}
                >
                  <EuiFieldText
                    value={indexName}
                    onChange={async e => {
                      await setIndexName(e.target.value);
                      validate();
                    }}
                  />
                </ErrableFormRow>
                <ErrableFormRow
                  label="Alias name"
                  errorKey={STRUCTURE_ALIAS_NAME}
                  isShowingErrors={isShowingErrors}
                  errors={errors}
                >
                  <EuiFieldText
                    value={aliasName}
                    onChange={async e => {
                      await setAliasName(e.target.value);
                      validate();
                    }}
                  />
                </ErrableFormRow>
              </Fragment>
            ) : null}
          </Fragment>
        ) : null}
      </EuiDescribedFormGroup>
    );
  }
}
