/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { debounce } from 'lodash';
import React, { Component, Fragment } from 'react';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiFieldSearch,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  EuiFormRow,
  EuiFieldText,
  EuiLoadingSpinner,
  EuiTabs,
  EuiTab,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { indexPatterns } from '../../../../../../../../../../../../src/plugins/data/public';

import { checkIndexPatternResults } from '../../../../../../../services/api';

import {
  Form,
  FormHook,
  UseField,
  TextField,
  fieldValidators,
} from '../../../../../../../../shared_imports';

import { Tab } from '../../../field_chooser_context';

import { CustomFieldForm } from './types';

const indexPatternIllegalCharacters = indexPatterns.ILLEGAL_CHARACTERS_VISIBLE.join(' ');

const { emptyField } = fieldValidators;

const tabs: Array<{ id: Tab; name: string }> = [
  {
    id: 'search',
    name: i18n.translate('xpack.indexLifecycleMgmt.rollup.create.fieldChooser.searchTabLabel', {
      defaultMessage: 'Search',
    }),
  },
  {
    id: 'custom',
    name: i18n.translate('xpack.indexLifecycleMgmt.rollup.create.fieldChooser.customTabLabel', {
      defaultMessage: 'Custom',
    }),
  },
];

function sortFields(a: { name: string }, b: { name: string }): number {
  const nameA = a.name.toUpperCase();
  const nameB = b.name.toUpperCase();

  if (nameA < nameB) {
    return -1;
  }

  if (nameA > nameB) {
    return 1;
  }

  return 0;
}

export interface Props {
  buttonLabel: React.ReactNode;
  columns: Array<EuiBasicTableColumn<{ name: string }>>;
  selectedFields: Array<{ name: string }>;
  onSelectField: (field: { name: string }) => void;
  indexPattern: string;
  onIndexPatternChange: (indexPattern: string) => void;
  currentTab: Tab;
  onCurrentTabChange: (tab: Tab) => void;
  customFieldForm: FormHook<CustomFieldForm>;
  prompt?: string;
  dataTestSubj?: string;
}

interface State {
  isOpen: boolean;
  isLoadingFields: boolean;
  loadingError?: Error;
  fields: Array<{ name: string; type: string }>;
  /**
   * The search value for filtering the results in the table
   */
  searchValue: string;
}

export class FieldChooser extends Component<Props, State> {
  static defaultProps = {
    prompt: i18n.translate(
      'xpack.indexLifecycleMgmt.rollup.create.fieldChooser.filterFieldPlaceholder',
      { defaultMessage: 'Filter results' }
    ),
    dataTestSubj: 'rollupFieldChooser',
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      isOpen: false,
      isLoadingFields: false,
      fields: [],
      searchValue: '',
    };

    this.updateFields();
  }

  onSearch = (e: { target: { value: string } }) => {
    this.setState({
      searchValue: e.target.value,
    });
  };

  onButtonClick = () => {
    this.setState((state) => ({
      isOpen: !state.isOpen,
    }));
  };

  close = () => {
    this.setState({
      isOpen: false,
    });
  };

  updateFields = debounce(
    () => {
      const updateFieldsResult = async () => {
        const { indexPattern } = this.props;
        if (indexPattern == null || indexPattern === '') {
          this.setState({ isLoadingFields: false, fields: [] });
          return;
        }
        this.setState({ isLoadingFields: true, fields: [] });
        try {
          const { fields } = await checkIndexPatternResults({ indexPattern });
          this.setState({
            isLoadingFields: false,
            fields: fields.sort(sortFields),
          });
        } catch (e) {
          this.setState({ isLoadingFields: false, fields: [], loadingError: e });
        }
      };
      updateFieldsResult();
    },
    200,
    { trailing: true }
  );

  componentDidUpdate(prevProps: Props) {
    if (prevProps.indexPattern !== this.props.indexPattern) {
      this.updateFields();
    }
  }

  renderSearchTabContent() {
    const { columns, selectedFields, prompt, onSelectField, dataTestSubj } = this.props;

    const getRowProps = (item: { name: string }) => {
      return {
        onClick: () => {
          onSelectField(item);
        },
      };
    };

    const { fields, searchValue } = this.state;

    // Derive the fields which the user can select.
    const unselectedFields = fields.filter(({ name }) => {
      return !selectedFields.find(({ name: selectedName }) => selectedName === name);
    });
    const normalizedSearchValue = searchValue.trim().toLowerCase();

    const searchedItems = searchValue
      ? unselectedFields.filter((item) => {
          return item.name.toLowerCase().includes(normalizedSearchValue);
        })
      : unselectedFields;

    const { indexPattern, onIndexPatternChange } = this.props;

    const { isLoadingFields } = this.state;

    const renderResultsSection = () => {
      if (isLoadingFields) {
        return (
          <div style={{ textAlign: 'center' }}>
            <EuiLoadingSpinner />
          </div>
        );
      }

      if (!indexPattern) {
        return <div />;
      }

      if (!searchedItems.length) {
        return (
          <p>
            {i18n.translate(
              'xpack.indexLifecycleMgmt.rollup.create.fieldChooser.noFieldsFoundDescription',
              { defaultMessage: 'No fields found' }
            )}
          </p>
        );
      }

      return (
        <>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate(
                    'xpack.indexLifecycleMgmt.rollup.create.fieldChooser.resultSectionTitle',
                    { defaultMessage: 'Results' }
                  )}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{isLoadingFields && <EuiLoadingSpinner />}</EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />

          <EuiFieldSearch
            placeholder={prompt}
            value={searchValue}
            onChange={this.onSearch}
            aria-label={prompt}
            fullWidth
          />
          <EuiBasicTable
            items={searchedItems}
            columns={columns}
            rowProps={getRowProps}
            responsive={false}
            data-test-subj={`${dataTestSubj}-table`}
          />
        </>
      );
    };

    return (
      <>
        <EuiFormRow
          label={i18n.translate(
            // TODO: Copy required
            'xpack.indexLifecycleMgmt.rollup.create.indexPatternFieldLabel',
            {
              defaultMessage: '[Index pattern]',
            }
          )}
          helpText={
            <>
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.create.fieldIndexPattern.helpAllowLabel"
                  defaultMessage="Use a wildcard ({asterisk}) to match multiple indices."
                  values={{ asterisk: <strong>*</strong> }}
                />
              </p>
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.create.fieldIndexPattern.helpDisallowLabel"
                  defaultMessage="Spaces and the characters {characterList} are not allowed."
                  values={{ characterList: <strong>{indexPatternIllegalCharacters}</strong> }}
                />
              </p>
            </>
          }
        >
          <EuiFieldText
            value={indexPattern}
            onChange={(e) => onIndexPatternChange(e.target.value)}
            placeholder="my-index-*"
            isLoading={isLoadingFields}
          />
        </EuiFormRow>

        <EuiSpacer />

        {renderResultsSection()}
      </>
    );
  }

  renderCustomTabContent() {
    const { selectedFields, onSelectField, customFieldForm } = this.props;
    return (
      <Form form={customFieldForm}>
        <UseField<string>
          path="field"
          form={customFieldForm}
          component={TextField}
          config={{
            defaultValue: '',
            helpText: (
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.rollup.create.fieldCustomFieldLabel.helpDescription"
                  defaultMessage="Provide a field name. A path can be specified by joining names with a {dot}. For example, {example}."
                  values={{ dot: <EuiCode>.</EuiCode>, example: <EuiCode>a.b.c</EuiCode> }}
                />
              </p>
            ),
            label: i18n.translate(
              // TODO: Copy required
              'xpack.indexLifecycleMgmt.rollup.create.fieldCustomFieldLabel',
              {
                defaultMessage: '[Field name]',
              }
            ),
            validations: [
              {
                validator: emptyField(
                  i18n.translate(
                    'xpack.indexLifecycleMgmt.rollup.create.fieldCustomFieldLabel.error.emptyField',
                    {
                      defaultMessage: 'A field value is required',
                    }
                  )
                ),
              },
              {
                validator: (arg) => {
                  const normalizedValue = arg.value.toLowerCase();
                  if (
                    selectedFields.some((field) => field.name.toLowerCase() === normalizedValue)
                  ) {
                    return {
                      message: i18n.translate(
                        'xpack.indexLifecycleMgmt.rollup.create.fieldCustomFieldLabel.error.alreadyAddedThisField',
                        {
                          defaultMessage: 'This field has already been added',
                        }
                      ),
                    };
                  }
                },
              },
            ],
          }}
        />
        <EuiButton
          onClick={async () => {
            const { data, isValid } = await customFieldForm.submit();
            if (!isValid) {
              return;
            }
            customFieldForm.reset();
            onSelectField({ name: data.field });
          }}
        >
          {i18n.translate(
            'xpack.indexLifecycleMgmt.rollup.create.fieldChooser.customField.addFieldButtonLabel',
            { defaultMessage: 'Add field' }
          )}
        </EuiButton>
      </Form>
    );
  }

  renderTabs() {
    const { currentTab, onCurrentTabChange } = this.props;
    return tabs.map((tab, idx) => (
      <EuiTab
        key={idx}
        isSelected={tab.id === currentTab}
        onClick={() => onCurrentTabChange(tab.id)}
      >
        {tab.name}
      </EuiTab>
    ));
  }

  render() {
    const { buttonLabel, dataTestSubj, currentTab } = this.props;
    const { isOpen } = this.state;

    let content: React.ReactNode;

    switch (currentTab) {
      case 'custom':
        content = this.renderCustomTabContent();
        break;
      case 'search':
      default:
        content = this.renderSearchTabContent();
    }

    const renderFlyout = () => {
      return (
        <EuiFlyout
          onClose={this.close}
          aria-labelledby="fieldChooserFlyoutTitle"
          size="m"
          maxWidth={400}
          data-test-subj={dataTestSubj}
        >
          <EuiFlyoutHeader>
            <EuiTitle
              size="m"
              id="fieldChooserFlyoutTitle"
              data-test-subj="rollupCreateFlyoutTitle"
            >
              <h2>{buttonLabel}</h2>
            </EuiTitle>
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <EuiTabs>{this.renderTabs()}</EuiTabs>
            <EuiSpacer />
            {content}
          </EuiFlyoutBody>
        </EuiFlyout>
      );
    };
    return (
      <Fragment>
        <EuiButton onClick={this.onButtonClick} data-test-subj="rollupShowFieldChooserButton">
          {buttonLabel}
        </EuiButton>

        {isOpen ? renderFlyout() : null}
      </Fragment>
    );
  }
}
