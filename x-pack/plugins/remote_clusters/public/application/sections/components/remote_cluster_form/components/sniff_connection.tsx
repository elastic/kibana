/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldNumber,
  EuiFormRow,
  EuiLink,
} from '@elastic/eui';

import { transportPortUrl } from '../../../../services/documentation';
import { validateSeed } from '../validators';
import { Props } from './connection_mode';

export const SniffConnection: FunctionComponent<Props> = ({
  fields,
  fieldsErrors,
  areErrorsVisible,
  onFieldsChange,
}) => {
  const [localSeedErrors, setLocalSeedErrors] = useState<JSX.Element[]>([]);
  const { seeds = [], nodeConnections } = fields;
  const { seeds: seedsError } = fieldsErrors;
  // Show errors if there is a general form error or local errors.
  const areFormErrorsVisible = Boolean(areErrorsVisible && seedsError);
  const showErrors = areFormErrorsVisible || localSeedErrors.length !== 0;
  const errors =
    areFormErrorsVisible && seedsError ? localSeedErrors.concat(seedsError) : localSeedErrors;
  const formattedSeeds: EuiComboBoxOptionOption[] = seeds.map((seed: string) => ({ label: seed }));

  const onCreateSeed = (newSeed?: string) => {
    // If the user just hit enter without typing anything, treat it as a no-op.
    if (!newSeed) {
      return;
    }

    const validationErrors = validateSeed(newSeed);

    if (validationErrors.length !== 0) {
      setLocalSeedErrors(validationErrors);
      // Return false to explicitly reject the user's input.
      return false;
    }

    const newSeeds = seeds.slice(0);
    newSeeds.push(newSeed.toLowerCase());
    onFieldsChange({ seeds: newSeeds });
  };

  const onSeedsInputChange = (seedInput?: string) => {
    if (!seedInput) {
      // If empty seedInput ("") don't do anything. This happens
      // right after a seed is created.
      return;
    }

    // Allow typing to clear the errors, but not to add new ones.
    const validationErrors =
      !seedInput || validateSeed(seedInput).length === 0 ? [] : localSeedErrors;

    // EuiComboBox internally checks for duplicates and prevents calling onCreateOption if the
    // input is a duplicate. So we need to surface this error here instead.
    const isDuplicate = seeds.includes(seedInput);

    if (isDuplicate) {
      validationErrors.push(
        <FormattedMessage
          id="xpack.remoteClusters.remoteClusterForm.localSeedError.duplicateMessage"
          defaultMessage="Duplicate seed nodes aren't allowed.`"
        />
      );
    }

    setLocalSeedErrors(validationErrors);
  };
  return (
    <>
      <EuiFormRow
        data-test-subj="remoteClusterFormSeedNodesFormRow"
        label={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.fieldSeedsLabel"
            defaultMessage="Seed nodes"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.fieldSeedsHelpText"
            defaultMessage="An IP address or host name, followed by the {transportPort} of the remote cluster. Specify multiple seed nodes so discovery doesn't fail if a node is unavailable."
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
        }
        isInvalid={showErrors}
        error={errors}
        fullWidth
      >
        <EuiComboBox
          noSuggestions
          placeholder={i18n.translate(
            'xpack.remoteClusters.remoteClusterForm.fieldSeedsPlaceholder',
            {
              defaultMessage: 'host:port',
            }
          )}
          selectedOptions={formattedSeeds}
          onCreateOption={onCreateSeed}
          onChange={(options: EuiComboBoxOptionOption[]) =>
            onFieldsChange({ seeds: options.map(({ label }) => label) })
          }
          onSearchChange={onSeedsInputChange}
          isInvalid={showErrors}
          fullWidth
          data-test-subj="remoteClusterFormSeedsInput"
        />
      </EuiFormRow>

      <EuiFormRow
        data-test-subj="remoteClusterFormNodeConnectionsFormRow"
        label={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.fieldNodeConnectionsLabel"
            defaultMessage="Node connections"
          />
        }
        helpText={
          <FormattedMessage
            id="xpack.remoteClusters.remoteClusterForm.fieldNodeConnectionsHelpText"
            defaultMessage="The number of gateway nodes to connect to for this cluster."
          />
        }
        fullWidth
      >
        <EuiFieldNumber
          value={nodeConnections || ''}
          onChange={(e) => onFieldsChange({ nodeConnections: Number(e.target.value) })}
          fullWidth
        />
      </EuiFormRow>
    </>
  );
};
