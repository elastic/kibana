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
  EuiSpacer,
} from '@elastic/eui';

import { LearnMoreLink } from '../../../../../../components/learn_more_link';
import { ErrableFormRow } from '../../../../form_errors';
import {
  STRUCTURE_TEMPLATE_NAME,
  STRUCTURE_INDEX_NAME,
  STRUCTURE_ALIAS_NAME,
} from '../../../../../../store/constants';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

export class TemplateSelectionUi extends Component {
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
      intl
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
        title={
          <h4>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.templateSelection.title"
              defaultMessage="Select an index template"
            />
          </h4>
        }
        fullWidth
        titleSize="s"
        description={
          <p>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.templateSelection.description"
              defaultMessage="An index template defines the settings, mappings, and aliases to apply when you create an index."
            />
            {' '}
            <LearnMoreLink
              docPath="indices-templates.html"
            />
          </p>
        }
      >
        <EuiSwitch
          label={
            intl.formatMessage({
              id: 'xpack.indexLifecycleMgmt.templateSelection.includeSystemIndices',
              defaultMessage: 'Include system indices',
            })
          }
          checked={isIncludingSystemIndices}
          onChange={this.onChangeIncludingSystemIndices}
        />
        <EuiSpacer/>
        <ErrableFormRow
          label={
            intl.formatMessage({
              id: 'xpack.indexLifecycleMgmt.templateSelection.existingIndexTemplates',
              defaultMessage: 'Your existing index templates',
            })
          }
          errorKey={STRUCTURE_TEMPLATE_NAME}
          isShowingErrors={isShowingErrors}
          errors={errors}
        >
          <EuiSelect
            value={selectedIndexTemplateName || ' '}
            onChange={async e => {
              await setSelectedIndexTemplate(e.target.value);
              validate();
            }}
            options={templateOptions}
          />
        </ErrableFormRow>
        <ErrableFormRow
          label={
            intl.formatMessage({
              id: 'xpack.indexLifecycleMgmt.templateSelection.aliasName',
              defaultMessage: 'Alias name',
            })
          }
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
        {selectedIndexTemplateName && selectedIndexTemplateIndices.length === 0 ? (
          <Fragment>
            <EuiFormRow label="Bootstrap options" style={{ maxWidth: '100%' }}>
              <EuiSwitch
                style={{ maxWidth: '100%' }}
                checked={bootstrapEnabled}
                onChange={e => setBootstrapEnabled(e.target.checked)}
                label={
                  intl.formatMessage({
                    id: 'xpack.indexLifecycleMgmt.templateSelection.createIndex',
                    defaultMessage: 'Create an index with this index template',
                  })
                }
              />
            </EuiFormRow>
            {bootstrapEnabled ? (
              <Fragment>
                <ErrableFormRow
                  label={
                    intl.formatMessage({
                      id: 'xpack.indexLifecycleMgmt.templateSelection.indexName',
                      defaultMessage: 'Index name',
                    })
                  }
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
              </Fragment>
            ) : null}
          </Fragment>
        ) : null}
      </EuiDescribedFormGroup>
    );
  }
}
export const TemplateSelection = injectI18n(TemplateSelectionUi);
