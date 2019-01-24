/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { merge } from 'lodash';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

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
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import {
  isSeedNodeValid,
  isSeedNodePortValid,
} from '../../../services';

import { skippingDisconnectedClustersUrl } from '../../../services/documentation_links';

const defaultFields = {
  name: '',
  seeds: [],
  skipUnavailable: false,
};

export const RemoteClusterForm = injectI18n(
  class extends Component {
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
      const fieldsState = merge({}, defaultFields, fields);

      this.state = {
        localSeedErrors: [],
        seedInput: '',
        fields: fieldsState,
        disabledFields,
        fieldsErrors: this.getFieldsErrors(fieldsState),
        areErrorsVisible: false,
      };
    }

    getFieldsErrors(fields, seedInput = '') {
      const { name, seeds } = fields;
      const errors = {};

      if (!name || !name.trim()) {
        errors.name = (
          <FormattedMessage
            id="xpack.remoteClusters.form.errors.nameMissing"
            defaultMessage="Name is required."
          />
        );
      } else if (name.match(/[^a-zA-Z\d\-_]/)) {
        errors.name = (
          <FormattedMessage
            id="xpack.remoteClusters.form.errors.illegalCharacters"
            defaultMessage="Name contains invalid characters."
          />
        );
      }

      if (!seeds.some(seed => Boolean(seed.trim()))) {
        // If the user hasn't entered any seeds then we only want to prompt them for some if they
        // aren't already in the process of entering one in. In this case, we'll just show the
        // combobox-specific validation.
        if (!seedInput) {
          errors.seeds = (
            <FormattedMessage
              id="xpack.remoteClusters.form.errors.seedMissing"
              defaultMessage="At least one seed node is required."
            />
          );
        }
      }

      return errors;
    }

    onFieldsChange = (changedFields) => {
      this.setState(({ fields: prevFields, seedInput }) => {
        const newFields = {
          ...prevFields,
          ...changedFields,
        };
        return ({
          fields: newFields,
          fieldsErrors: this.getFieldsErrors(newFields, seedInput),
        });
      });
    };

    getAllFields() {
      const {
        fields: {
          name,
          seeds,
          skipUnavailable,
        },
      } = this.state;

      return {
        name,
        seeds,
        skipUnavailable,
      };
    }

    save = () => {
      const { save } = this.props;

      if (this.hasErrors()) {
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

      if (!seedNode) {
        return errors;
      }

      const isInvalid = !isSeedNodeValid(seedNode);

      if (isInvalid) {
        errors.push(intl.formatMessage({
          id: 'xpack.remoteClusters.remoteClusterForm.localSeedError.invalidCharactersMessage',
          defaultMessage: `Seed node must use host:port format. Example: 127.0.0.1:9400, localhost:9400.
            Hosts can only consist of letters, numbers, and dashes.`,
        }));
      }

      const isPortInvalid = !isSeedNodePortValid(seedNode);

      if (isPortInvalid) {
        errors.push(intl.formatMessage({
          id: 'xpack.remoteClusters.remoteClusterForm.localSeedError.invalidPortMessage',
          defaultMessage: 'A port is required.',
        }));
      }

      return errors;
    };

    onCreateSeed = (newSeed) => {
      // If the user just hit enter without typing anything, treat it as a no-op.
      if (!newSeed) {
        return;
      }

      const localSeedErrors = this.getLocalSeedErrors(newSeed);

      if (localSeedErrors.length !== 0) {
        this.setState({
          localSeedErrors,
        });

        // Return false to explicitly reject the user's input.
        return false;
      }

      const {
        fields: {
          seeds,
        },
      } = this.state;

      const newSeeds = seeds.slice(0);
      newSeeds.push(newSeed.toLowerCase());
      this.onFieldsChange({ seeds: newSeeds });
    };

    onSeedsInputChange = (seedInput) => {
      if (!seedInput) {
        // If empty seedInput ("") don't do anything. This happens
        // right after a seed is created.
        return;
      }

      const { intl } = this.props;

      this.setState(({ fields, localSeedErrors }) => {
        const { seeds } = fields;

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

        return ({
          localSeedErrors: errors,
          fieldsErrors: this.getFieldsErrors(fields, seedInput),
          seedInput,
        });
      });
    };

    onSeedsChange = (seeds) => {
      this.onFieldsChange({ seeds: seeds.map(({ label }) => label) });
    };

    onSkipUnavailableChange = (e) => {
      const skipUnavailable = e.target.checked;
      this.onFieldsChange({ skipUnavailable });
    };

    resetToDefault = (fieldName) => {
      this.onFieldsChange({
        [fieldName]: defaultFields[fieldName],
      });
    };

    hasErrors = () => {
      const { fieldsErrors, localSeedErrors } = this.state;
      const errorValues = Object.values(fieldsErrors);
      const hasErrors = errorValues.some(error => error !== undefined) || localSeedErrors.length;
      return hasErrors;
    };

    renderSeeds() {
      const {
        areErrorsVisible,
        fields: {
          seeds,
        },
        fieldsErrors: {
          seeds: errorsSeeds,
        },
        localSeedErrors,
      } = this.state;

      const { intl } = this.props;

      // Show errors if there is a general form error or local errors.
      const areFormErrorsVisible = Boolean(areErrorsVisible && errorsSeeds);
      const showErrors = areFormErrorsVisible || localSeedErrors.length !== 0;
      const errors = areFormErrorsVisible ? localSeedErrors.concat(errorsSeeds) : localSeedErrors;

      const formattedSeeds = seeds.map(seed => ({ label: seed }));

      return (
        <EuiDescribedFormGroup
          title={(
            <EuiTitle size="s">
              <h4>
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.sectionSeedsTitle"
                  defaultMessage="Seed nodes for cluster discovery"
                />
              </h4>
            </EuiTitle>
          )}
          description={(
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.sectionSeedsDescription1"
                  defaultMessage="A list of remote cluster nodes to query for the cluster state.
                    Specify multiple seed nodes so discovery doesn't fail if a node is unavailable."
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
                defaultMessage="Seed nodes"
              />
            )}
            helpText={(
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.sectionSeedsHelpText"
                defaultMessage="An IP address or host name, followed by the transport port of the remote cluster."
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
                defaultMessage: 'host:port',
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

    renderSkipUnavailable() {
      const {
        fields: {
          skipUnavailable,
        },
      } = this.state;

      return (
        <EuiDescribedFormGroup
          title={(
            <EuiTitle size="s">
              <h4>
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableTitle"
                  defaultMessage="Make remote cluster optional"
                />
              </h4>
            </EuiTitle>
          )}
          description={(
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableDescription"
                  defaultMessage="By default, a request fails if any of the queried remote clusters
                    are unavailable. To continue sending a request to other remote clusters if this
                    cluster is unavailable, enable {optionName}. {learnMoreLink}"
                  values={{
                    optionName: (
                      <strong>
                        <FormattedMessage
                          id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableDescription.optionNameLabel"
                          defaultMessage="Skip if unavailable"
                        />
                      </strong>
                    ),
                    learnMoreLink: (
                      <EuiLink href={skippingDisconnectedClustersUrl} target="_blank">
                        <FormattedMessage
                          id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableDescription.learnMoreLinkLabel"
                          defaultMessage="Learn more."
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </p>
            </Fragment>
          )}
          fullWidth
        >
          <EuiFormRow
            className="remoteClusterSkipIfUnavailableSwitch"
            hasEmptyLabelSpace
            fullWidth
            helpText={
              skipUnavailable !== defaultFields.skipUnavailable ? (
                <EuiLink onClick={() => { this.resetToDefault('skipUnavailable'); }}>
                  <FormattedMessage
                    id="xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableResetLabel"
                    defaultMessage="Reset to default"
                  />
                </EuiLink>
              ) : null
            }
          >
            <EuiSwitch
              label={i18n.translate('xpack.remoteClusters.remoteClusterForm.sectionSkipUnavailableLabel', {
                defaultMessage: 'Skip if unavailable',
              })}
              checked={skipUnavailable}
              onChange={this.onSkipUnavailableChange}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      );
    }

    renderActions() {
      const { isSaving, cancel } = this.props;
      const { areErrorsVisible } = this.state;

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

      const isSaveDisabled = areErrorsVisible && this.hasErrors();

      return (
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiButton
              color="secondary"
              iconType="check"
              onClick={this.save}
              fill
              disabled={isSaveDisabled}
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

    renderErrors = () => {
      const { areErrorsVisible } = this.state;
      const hasErrors = this.hasErrors();

      if (!areErrorsVisible || !hasErrors) {
        return null;
      }

      return (
        <Fragment>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={(
              <FormattedMessage
                id="xpack.remoteClusters.remoteClusterForm.errorTitle"
                defaultMessage="Fix errors before continuing."
              />
            )}
            color="danger"
            iconType="cross"
          />
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
      } = this.state;

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
                      defaultMessage="Name"
                    />
                  </h4>
                </EuiTitle>
              )}
              description={(
                <FormattedMessage
                  id="xpack.remoteClusters.remoteClusterForm.sectionNameDescription"
                  defaultMessage="A unique name for the remote cluster."
                />
              )}
              fullWidth
            >
              <EuiFormRow
                label={(
                  <FormattedMessage
                    id="xpack.remoteClusters.remoteClusterForm.fieldNameLabel"
                    defaultMessage="Name"
                  />
                )}
                helpText={(
                  <FormattedMessage
                    id="xpack.remoteClusters.remoteClusterForm.fieldNameLabelHelpText"
                    defaultMessage="Name can only contain letters, numbers, underscores, and dashes."
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

            {this.renderSeeds()}

            {this.renderSkipUnavailable()}
          </EuiForm>

          {this.renderErrors()}

          <EuiSpacer size="l" />

          {this.renderActions()}

          {this.renderSavingFeedback()}
        </Fragment>
      );
    }
  }
);
