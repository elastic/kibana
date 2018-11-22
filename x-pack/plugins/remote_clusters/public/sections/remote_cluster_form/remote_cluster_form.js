/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { merge } from 'lodash';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiLoadingKibana,
  EuiLoadingSpinner,
  EuiOverlayMask,
  EuiRadioGroup,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import {
  isSeedNodeValid,
  isSeedNodePortValid,
} from '../../services';

const defaultFields = {
  name: '',
  seeds: [],
  skipUnavailable: null,
  transientSettings: {
    seeds: [],
    skipUnavailable: null,
  },
  persistentSettings: {
    seeds: [],
    skipUnavailable: null,
  }
};

const skipUnavailableOptionIdPrefix = 'remoteClusterFormSkipUnavailableOption_';
const skipUnavailableOptions = [
  {
    id: `${skipUnavailableOptionIdPrefix}null`,
    label: (
      <FormattedMessage
        id="xpack.remoteClusters.remoteClusterForm.fieldSkipUnavailable.nullOptionLabel"
        defaultMessage="Default (fallback to other settings or default value)"
      />
    )
  },
  {
    id: `${skipUnavailableOptionIdPrefix}true`,
    label: (
      <FormattedMessage
        id="xpack.remoteClusters.remoteClusterForm.fieldSkipUnavailable.trueOptionLabel"
        defaultMessage="Yes"
      />
    )
  },
  {
    id: `${skipUnavailableOptionIdPrefix}false`,
    label: (
      <FormattedMessage
        id="xpack.remoteClusters.remoteClusterForm.fieldSkipUnavailable.falseOptionLabel"
        defaultMessage="No"
      />
    )
  }
];

export class RemoteClusterFormUi extends Component {
  static propTypes = {
    save: PropTypes.func.isRequired,
    cancel: PropTypes.func,
    isSaving: PropTypes.bool,
    saveError: PropTypes.object,
    fields: PropTypes.object,
    disabledFields: PropTypes.object,
  }

  static defaultProps = {
    fields: merge({}, defaultFields),
    disabledFields: {},
  }

  constructor(props) {
    super(props);

    const { fields, disabledFields } = props;
    const { isTransient } = fields;
    const currentSettingType = isTransient ? 'transient' : 'persistent';
    const fieldsState = merge({}, defaultFields, fields);

    this.state = {
      localSeedErrors: [],
      fields: fieldsState,
      disabledFields,
      fieldsErrors: this.getFieldsErrors(fieldsState),
      areErrorsVisible: false,
      currentSettingType,
    };
  }

  getFieldsErrors(fields) {
    const {
      name,
      transientSettings,
      persistentSettings,
    } = fields;

    const hasTransientSeeds = transientSettings.seeds.some(seed => Boolean(seed.trim()));
    const hasPersistentSeeds = persistentSettings.seeds.some(seed => Boolean(seed.trim()));

    const hasOtherTransientSettings = typeof transientSettings.skipUnavailable === 'boolean';
    const hasOtherPersistentSettings = typeof persistentSettings.skipUnavailable === 'boolean';

    const errors = {};

    if (!name || !name.trim()) {
      errors.name = (
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterForm.errors.nameMissing"
          defaultMessage="Name is required."
        />
      );
    }

    if(!hasTransientSeeds && !hasPersistentSeeds) {
      errors.seeds = (
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterForm.errors.allSeedMissing"
          defaultMessage="At least one seed is required between transient and persistent settings."
        />
      );
    }

    if(!hasTransientSeeds && hasOtherTransientSettings) {
      errors.settings = (
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterForm.errors.transientSeedMissing"
          defaultMessage="At least one seed is required to define additional transient settings."
        />
      );
    } else if (!hasPersistentSeeds && hasOtherPersistentSettings) {
      errors.settings = (
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterForm.errors.persistentSeedMissing"
          defaultMessage="At least one seed is required to define additional persistent settings."
        />
      );
    }

    return errors;
  }

  onFieldsChange = (changedFields) => {
    const {
      fields,
      currentSettingType,
    } = this.state;

    const {
      name,
      ...rest
    } = changedFields;

    const hasNameChange = !!name;
    const hasSettingChanges = rest && Object.keys(rest).length;
    const prevFields = this.getCurrentFields();

    const newFieldsState = {
      ...fields,
    };

    if(hasNameChange) {
      Object.assign(newFieldsState, {
        name
      });
    }

    if(hasSettingChanges) {
      Object.assign(newFieldsState, {
        [`${currentSettingType}Settings`]: {
          ...prevFields,
          ...rest,
        }
      });
    }

    this.setState({
      fields: newFieldsState,
      fieldsErrors: this.getFieldsErrors(newFieldsState),
    });
  };

  getAllFields() {
    const {
      fields: {
        name,
        transientSettings,
        persistentSettings,
      },
    } = this.state;

    return {
      name,
      transientSettings,
      persistentSettings,
    };
  }

  save = () => {
    const { save } = this.props;
    const { fieldsErrors } = this.state;

    if (Object.keys(fieldsErrors).length > 0) {
      this.setState({
        areErrorsVisible: true,
      });
      return;
    }

    const cluster = this.getAllFields();

    save(cluster);
  };

  getLocalSeedErrors = (seedNode) => {
    const { intl } = this.props;

    const errors = [];

    const isInvalid = !isSeedNodeValid(seedNode);

    if (isInvalid) {
      errors.push(intl.formatMessage({
        id: 'xpack.remoteClusters.remoteClusterForm.localSeedError.invalidCharactersMessage',
        defaultMessage: `Seed nodes must consist of valid characters, with optional parts separated
        by periods. Valid characters are lowercase letters, numbers, and dashes.`,
      }));
    }

    const isPortInvalid = !isSeedNodePortValid(seedNode);

    if (isPortInvalid) {
      errors.push(intl.formatMessage({
        id: 'xpack.remoteClusters.remoteClusterForm.localSeedError.invalidPortMessage',
        defaultMessage: 'Seed node must define a numeric port.',
      }));
    }

    return errors;
  };

  onCreateSeed = (newSeed) => {
    const localSeedErrors = this.getLocalSeedErrors(newSeed);

    if (localSeedErrors.length !== 0) {
      this.setState({
        localSeedErrors,
      });

      // Return false to explicitly reject the user's input.
      return false;
    }

    const { seeds } = this.getCurrentFields();
    const newSeeds = seeds.slice(0);

    newSeeds.push(newSeed.toLowerCase());
    this.onFieldsChange({ seeds: newSeeds });
  };

  onSeedsInputChange = (seedInput) => {
    const { intl } = this.props;

    const { localSeedErrors } = this.state;
    const { seeds } = this.getCurrentFields();

    // Allow typing to clear the errors, but not to add new ones.
    const errors = (!seedInput || this.getLocalSeedErrors(seedInput).length === 0) ? [] : localSeedErrors;

    // EuiComboBox internally checks for duplicates and prevents calling onCreateOption if the
    // input is a duplicate. So we need to surface this error here instead.
    const isDuplicate = seeds.includes(seedInput);

    if (isDuplicate) {
      errors.push(intl.formatMessage({
        id: 'xpack.remoteClusters.remoteClusterForm.localSeedError.duplicateMessage',
        defaultMessage: `Duplicate seed nodes aren't allowed.`,
      }));
    }

    this.setState({
      localSeedErrors: errors,
    });
  };

  onSeedsChange = (seeds) => {
    this.onFieldsChange({ seeds: seeds.map(({ label }) => label) });
  };

  getCurrentFields() {
    const {
      fields: {
        transientSettings,
        persistentSettings,
      },
      currentSettingType,
    } = this.state;

    return currentSettingType === 'transient' ? transientSettings : persistentSettings;
  }

  clearCurrentFields = () => {
    this.onFieldsChange({
      seeds: [],
      skipUnavailable: null,
    });
  }

  renderSeeds() {
    const { localSeedErrors } = this.state;
    const { intl } = this.props;
    const { seeds } = this.getCurrentFields();

    // Show local errors.
    const showErrors = localSeedErrors.length !== 0;
    const errors = localSeedErrors;

    const formattedSeeds = seeds.map(seed => ({ label: seed }));

    return (
      <EuiDescribedFormGroup
        title={(
          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionSeedsTitle"
                defaultMessage="Seed nodes"
              />
            </h4>
          </EuiTitle>
        )}
        description={(
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionSeedsDescription1"
                defaultMessage="When connecting to this remote cluster, its cluster state will be
                retrieved from one of its seed nodes so that by default up to three gateway nodes
                are selected to be connected to as part of remote cluster requests."
              />
            </p>

            <p>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionSeedsDescription2"
                defaultMessage="Seed nodes can be defined as IP addresses or host names, but they
                must contain a port."
              />
            </p>
          </Fragment>
        )}
        fullWidth
      >
        <EuiFormRow
          label={(
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.fieldSeedsLabel"
              defaultMessage="IP addresses or hostnames"
            />
          )}
          isInvalid={showErrors}
          error={errors}
          fullWidth
        >
          <EuiComboBox
            noSuggestions
            placeholder={intl.formatMessage({
              id: 'xpack.remoteClusters.remoteClusterForm.fieldSeedsPlaceholder',
              defaultMessage: 'Type and then hit ENTER',
            })}
            selectedOptions={formattedSeeds}
            onCreateOption={this.onCreateSeed}
            onChange={this.onSeedsChange}
            onSearchChange={this.onSeedsInputChange}
            isInvalid={showErrors}
            fullWidth
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  onSkipUnavailableChange = (skipUnavailableOptionId) => {
    let skipUnavailableValue;
    if(skipUnavailableOptionId === skipUnavailableOptions[1].id) {
      skipUnavailableValue = true;
    } else if(skipUnavailableOptionId === skipUnavailableOptions[2].id) {
      skipUnavailableValue = false;
    } else {
      skipUnavailableValue = null;
    }

    this.onFieldsChange({ skipUnavailable: skipUnavailableValue });
  }

  renderSkipUnavailable() {
    const { skipUnavailable } = this.getCurrentFields();

    let selectedOptionId;
    if(skipUnavailable === true) {
      selectedOptionId = skipUnavailableOptions[1].id;
    } else if(skipUnavailable === false) {
      selectedOptionId = skipUnavailableOptions[2].id;
    } else {
      selectedOptionId = skipUnavailableOptions[0].id;
    }

    return (
      <EuiDescribedFormGroup
        title={(
          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableTitle"
                defaultMessage="Skip unavailable"
              />
            </h4>
          </EuiTitle>
        )}
        description={(
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableDescription"
                defaultMessage="Per cluster boolean setting that allows to skip specific clusters
                  when no nodes belonging to them are available and they are the target of a remote
                  cluster request. Default is false, meaning that all clusters are mandatory by default,
                  but they can selectively be made optional by setting this setting to true."
              />
            </p>
          </Fragment>
        )}
        fullWidth
      >
        <EuiFormRow
          hasEmptyLabelSpace
          fullWidth
        >
          <EuiRadioGroup
            options={skipUnavailableOptions}
            idSelected={selectedOptionId}
            onChange={this.onSkipUnavailableChange}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }

  renderActions() {
    const { isSaving, cancel } = this.props;

    if (isSaving) {
      return (
        <EuiFlexGroup justifyContent="flexStart" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l"/>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.actions.savingText"
                defaultMessage="Saving"
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    let cancelButton;

    if (cancel) {
      cancelButton = (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="primary"
            onClick={cancel}
          >
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      );
    }

    return (
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            color="secondary"
            iconType="check"
            onClick={this.save}
            fill
          >
            <FormattedMessage
              id="xpack.remoteClusters.remoteClusterForm.saveButtonLabel"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiFlexItem>

        {cancelButton}
      </EuiFlexGroup>
    );
  }

  renderSavingFeedback() {
    if (this.props.isSaving) {
      return (
        <EuiOverlayMask>
          <EuiLoadingKibana size="xl"/>
        </EuiOverlayMask>
      );
    }

    return null;
  }

  renderSaveErrorFeedback() {
    const { saveError } = this.props;

    if (saveError) {
      const { message, cause } = saveError;

      let errorBody;

      if (cause) {
        if (cause.length === 1) {
          errorBody = (
            <p>{cause[0]}</p>
          );
        } else {
          errorBody = (
            <ul>
              {cause.map(causeValue => <li key={causeValue}>{causeValue}</li>)}
            </ul>
          );
        }
      }

      return (
        <Fragment>
          <EuiCallOut
            title={message}
            icon="cross"
            color="danger"
          >
            {errorBody}
          </EuiCallOut>

          <EuiSpacer />
        </Fragment>
      );
    }

    return null;
  }

  renderFormErrors() {
    const {
      areErrorsVisible,
      fieldsErrors: {
        seeds: seedError,
        settings: settingsError,
      },
    } = this.state;
    const errors = [seedError, settingsError].filter(error => Boolean(error));
    const areFormErrorsVisible = Boolean(areErrorsVisible && errors.length);

    return areFormErrorsVisible ? (
      <Fragment>
        {errors.map((error, i) => {
          return error ? (
            <Fragment key={`remoteClusterFormError${i}`}>
              <EuiCallOut
                title={error}
                icon="cross"
                color="danger"
              />
              <EuiSpacer />
            </Fragment>
          ) : null;
        })}
      </Fragment>
    ) : null;
  }

  renderForm() {
    return (
      <Fragment>
        {this.renderSeeds()}
        {this.renderSkipUnavailable()}
      </Fragment>
    );
  }

  render() {
    const {
      disabledFields: {
        name: disabledName,
      },
    } = this.props;

    const {
      areErrorsVisible,
      fields: {
        name,
      },
      fieldsErrors: {
        name: errorClusterName,
      },
      currentSettingType,
    } = this.state;

    const tabs = [
      {
        id: 'transient',
        name: 'Transient',
        content: (
          <Fragment>
            <EuiSpacer size="l" />
            <EuiText>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.transientSettingsInfo"
                defaultMessage="Transient settings take precedence over persistent and
                  configuration file settings. They will not survive a
                  full cluster restart."
              />
              {' '}
              <EuiLink onClick={this.clearCurrentFields}>
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.transientSettingsClearButton"
                  defaultMessage="Clear settings"
                />
              </EuiLink>
            </EuiText>
            <EuiSpacer size="m" />
            {this.renderForm()}
          </Fragment>
        )
      },
      {
        id: 'persistent',
        name: 'Persistent',
        content: (
          <Fragment>
            <EuiSpacer size="l" />
            <EuiText>
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.persistentSettingsInfo"
                defaultMessage="Persistent settings take precedence over configuration
                file settings. They will be applied across cluster restarts."
              />
              {' '}
              <EuiLink onClick={this.clearCurrentFields}>
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.persistentSettingsClearButton"
                  defaultMessage="Clear settings"
                />
              </EuiLink>
            </EuiText>
            <EuiSpacer size="m" />
            {this.renderForm()}
          </Fragment>
        )
      }
    ];

    return (
      <Fragment>
        {this.renderSaveErrorFeedback()}

        <EuiForm>
          <EuiDescribedFormGroup
            title={(
              <EuiTitle size="s">
                <h4>
                  <FormattedMessage
                    id="xpack.remoteClusters.remoteClusterForm.sectionNameTitle"
                    defaultMessage="Remote cluster name"
                  />
                </h4>
              </EuiTitle>
            )}
            description={(
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionNameDescription"
                defaultMessage="This is the name of the remote cluster you want to connect to."
              />
            )}
            fullWidth
          >
            <EuiFormRow
              label={(
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.fieldNameLabel"
                  defaultMessage="Remote cluster name"
                />
              )}
              error={errorClusterName}
              isInvalid={Boolean(areErrorsVisible && errorClusterName)}
              fullWidth
            >
              <EuiFieldText
                isInvalid={Boolean(areErrorsVisible && errorClusterName)}
                value={name}
                onChange={e => this.onFieldsChange({ name: e.target.value })}
                fullWidth
                disabled={disabledName}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>

          {this.renderFormErrors()}
          <EuiTabbedContent
            tabs={tabs}
            initialSelectedTab={currentSettingType === 'transient' ? tabs[0] : tabs[1]}
            onTabClick={(tab) => this.setState({ currentSettingType: tab.id })}
          />
        </EuiForm>

        <EuiSpacer size="l" />

        {this.renderActions()}
        {this.renderSavingFeedback()}
      </Fragment>
    );
  }
}

export const RemoteClusterForm = injectI18n(RemoteClusterFormUi);
