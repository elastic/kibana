/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { debounce } from 'lodash';
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiBasicTable,
  EuiButton,
  EuiFieldSearch,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
  EuiFormRow,
  EuiFieldText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { checkIndexPatternResults } from '../../../../../../services/api';

function sortFields(a, b) {
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

export class FieldChooser extends Component {
  static propTypes = {
    buttonLabel: PropTypes.node.isRequired,
    columns: PropTypes.array.isRequired,
    selectedFields: PropTypes.array.isRequired,
    onSelectField: PropTypes.func.isRequired,
    indexPattern: PropTypes.string.isRequired,
    onIndexPatternChange: PropTypes.func.isRequired,
    prompt: PropTypes.string,
    dataTestSubj: PropTypes.string,
  };

  static defaultProps = {
    prompt: 'Search',
    dataTestSubj: 'rollupFieldChooser',
  };

  constructor(props) {
    super(props);

    this.state = {
      isOpen: false,
      isLoading: false,
      fields: [],
      searchValue: '',
    };

    this.updateFields();
  }

  onSearch = (e) => {
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
          this.setState({ isLoading: false, fields: [] });
          return;
        }
        this.setState({ isLoading: true, fields: [] });
        try {
          const { fields } = await checkIndexPatternResults({ indexPattern });
          this.setState({
            isLoading: false,
            fields: fields.map(({ name }) => ({ name })).sort(sortFields),
          });
        } catch (e) {
          this.setState({ isLoading: false, fields: [], error: e });
        }
      };
      updateFieldsResult();
    },
    200,
    { trailing: true }
  );

  componentDidUpdate(prevProps) {
    if (prevProps.indexPattern !== this.props.indexPattern) {
      this.updateFields();
    }
  }

  render() {
    const {
      buttonLabel,
      columns,
      selectedFields,
      prompt,
      onSelectField,
      dataTestSubj,
    } = this.props;

    const { fields } = this.state;

    const { isOpen, searchValue } = this.state;

    const getRowProps = (item) => {
      return {
        onClick: () => {
          onSelectField(item);
        },
      };
    };

    const renderFlyout = () => {
      // Derive the fields which the user can select.
      const unselectedFields = fields.filter(({ name }) => {
        return !selectedFields.find(({ name: selectedName }) => selectedName === name);
      });

      const { indexPattern, onIndexPatternChange } = this.props;

      const searchedItems = searchValue
        ? unselectedFields.filter((item) => {
            const normalizedSearchValue = searchValue.trim().toLowerCase();
            return item.name.toLowerCase().includes(normalizedSearchValue);
          })
        : unselectedFields;

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

            <EuiSpacer size="s" />

            {/* TODO: Copy required */}
            <EuiFormRow label="Index pattern">
              <EuiFieldText
                value={indexPattern}
                onChange={(e) => onIndexPatternChange(e.target.value)}
              />
            </EuiFormRow>

            <EuiHorizontalRule />

            <EuiFieldSearch
              placeholder={prompt}
              value={searchValue}
              onChange={this.onSearch}
              aria-label={prompt}
              fullWidth
            />
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <EuiBasicTable
              items={searchedItems}
              columns={columns}
              rowProps={getRowProps}
              responsive={false}
              data-test-subj={`${dataTestSubj}-table`}
            />
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
