/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiComboBox,
  EuiFormRow,
  EuiLink,
} from '@elastic/eui';

import { transportPortUrl } from '../../../services/documentation_links';
import { validateSeed } from './validators';

export class SeedsFormRow extends Component {
  static propTypes = {
    value: PropTypes.array,
    errors: PropTypes.node,
    onChange: PropTypes.func,
  }

  static defaultProps = {
    value: [],
    errors: [],
  }

  constructor(...args) {
    super(...args);

    this.state = {
      localSeedErrors: [],
    };
  }

  onCreateSeed = (newSeed) => {
    // If the user just hit enter without typing anything, treat it as a no-op.
    if (!newSeed) {
      return;
    }

    const localSeedErrors = validateSeed(newSeed);

    if (localSeedErrors.length !== 0) {
      this.setState({
        localSeedErrors,
      });

      // Return false to explicitly reject the user's input.
      return false;
    }

    const { value, onChange } = this.props;
    const newSeeds = value.slice(0);
    newSeeds.push(newSeed.toLowerCase());
    onChange(newSeeds);
  };

  onSeedsChange = (seeds) => {
    this.props.onChange(seeds.map(({ label }) => label));
  };

  onSeedsInputChange = (seedInput) => {
    this.setState(({ localSeedErrors }) => {
      const { value } = this.props;

      // Allow typing to clear the errors, but not to add new ones.
      const errors = (!seedInput || validateSeed(seedInput).length === 0) ? [] : localSeedErrors;

      // EuiComboBox internally checks for duplicates and prevents calling onCreateOption if the
      // input is a duplicate. So we need to surface this error here instead.
      const isDuplicate = value.includes(seedInput);

      if (isDuplicate) {
        errors.push(i18n.translate(
          'xpack.remoteClusters.remoteClusterForm.localSeedError.duplicateMessage',
          { defaultMessage: `Duplicate seed nodes aren't allowed.` }
        ));
      }

      return ({
        localSeedErrors: errors,
      });
    });
  };

  render() {
    const { value, errors } = this.props;

    const {
      localSeedErrors,
    } = this.state;

    // Show errors if there is a form-level error or local errors.
    const hasFormLevelError = Array.isArray(errors)
      ? errors.length !== 0
      : Boolean(errors);
    const showErrors = hasFormLevelError || localSeedErrors.length !== 0;
    // FIeld-level errors override form-level errors.
    const fieldErrors = localSeedErrors.length === 0 ? errors : localSeedErrors;

    const formattedSeeds = value.map(seed => ({ label: seed }));

    return (
      <EuiFormRow
        data-test-subj="remoteClusterFormSeedNodesFormRow"
        label={(
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.fieldSeedsLabel"
            defaultMessage="Seed nodes"
          />
        )}
        helpText={(
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.sectionSeedsHelpText"
            defaultMessage="An IP address or host name, followed by the {transportPort} of the remote cluster."
            values={{
              transportPort: (
                <EuiLink href={transportPortUrl} target="_blank">
                  <FormattedMessage
                    id="xpack.remoteClusters.remoteClusterForm.sectionSeedsHelpText.transportPortLinkText"
                    defaultMessage="transport port"
                  />
                </EuiLink>
              ),
            }}
          />
        )}
        isInvalid={showErrors}
        error={showErrors && fieldErrors}
        fullWidth
      >
        <EuiComboBox
          noSuggestions
          placeholder={i18n.translate(
            'xpack.remoteClusters.remoteClusterForm.fieldSeedsPlaceholder',
            { defaultMessage: 'host:port' }
          )}
          selectedOptions={formattedSeeds}
          onCreateOption={this.onCreateSeed}
          onChange={this.onSeedsChange}
          onSearchChange={this.onSeedsInputChange}
          isInvalid={showErrors}
          fullWidth
        />
      </EuiFormRow>
    );
  }
}
