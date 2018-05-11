/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
import PropTypes from 'prop-types';

import { EuiSelect, EuiFormRow, EuiSwitch, EuiFieldText } from '@elastic/eui';
import { ErrableFormRow } from '../../../../form_errors';
import {
  STRUCTURE_TEMPLATE_NAME,
  STRUCTURE_INDEX_NAME,
  STRUCTURE_ALIAS_NAME,
} from '../../../../../../store/constants';

export class TemplateSelection extends PureComponent {
  static propTypes = {
    fetchIndexTemplates: PropTypes.func.isRequired,
    setSelectedIndexTemplate: PropTypes.func.isRequired,
    validate: PropTypes.func.isRequired,

    selectedIndexTemplateName: PropTypes.string.isRequired,
    templateOptions: PropTypes.array.isRequired,
    errors: PropTypes.object.isRequired,
    isShowingErrors: PropTypes.bool.isRequired,
  };

  componentWillMount() {
    this.props.fetchIndexTemplates();
  }

  render() {
    const {
      setSelectedIndexTemplate,
      validate,
      setBootstrapEnabled,
      setIndexName,
      setAliasName,

      bootstrapEnabled,
      templateOptions,
      selectedIndexTemplateIndices,
      indexName,
      aliasName,
      selectedIndexTemplateName,
      errors,
      isShowingErrors,
    } = this.props;

    return (
      <Fragment>
        <ErrableFormRow
          label="Template name"
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
                  label="Name your index"
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
                  label="Name your alias"
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
      </Fragment>
    );
  }
}
