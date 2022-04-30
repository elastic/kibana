/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { META_ENGINES_DOCS_URL } from '../../routes';

export const DEFAULT_LANGUAGE = 'Universal';

export const META_ENGINE_CREATION_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.metaEngineCreation.title',
  {
    defaultMessage: 'Create a meta engine',
  }
);

export const META_ENGINE_CREATION_FORM_TITLE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.metaEngineCreation.form.title',
  {
    defaultMessage: 'Name your meta engine',
  }
);

export const META_ENGINE_CREATION_FORM_SUBMIT_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.metaEngineCreation.form.submitButton.buttonLabel',
  {
    defaultMessage: 'Create meta engine',
  }
);

export const META_ENGINE_CREATION_FORM_META_ENGINE_DESCRIPTION = i18n.translate(
  'xpack.enterpriseSearch.appSearch.metaEngineCreation.form.metaEngineDescription',
  {
    defaultMessage:
      'Meta engines allow you to combine multiple engines into one searchable engine.',
  }
);

export const META_ENGINE_CREATION_FORM_DOCUMENTATION_LINK = i18n.translate(
  'xpack.enterpriseSearch.appSearch.metaEngineCreation.form.documentationLink',
  {
    defaultMessage: 'Read the documentation',
  }
);

export const META_ENGINE_CREATION_FORM_DOCUMENTATION_DESCRIPTION = (
  <FormattedMessage
    id="xpack.enterpriseSearch.appSearch.metaEngineCreation.form.documentationDescription"
    defaultMessage="{documentationLink} for information about how to get started."
    values={{
      documentationLink: (
        <EuiLink href={META_ENGINES_DOCS_URL} target="_blank">
          {META_ENGINE_CREATION_FORM_DOCUMENTATION_LINK}
        </EuiLink>
      ),
    }}
  />
);

export const META_ENGINE_CREATION_FORM_ENGINE_NAME_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.metaEngineCreation.form.engineName.label',
  {
    defaultMessage: 'Meta engine name',
  }
);

export const ALLOWED_CHARS_NOTE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.metaEngineCreation.form.engineName.allowedCharactersHelpText',
  {
    defaultMessage: 'Meta engine names can only contain lowercase letters, numbers, and hyphens',
  }
);

export const SANITIZED_NAME_NOTE = i18n.translate(
  'xpack.enterpriseSearch.appSearch.metaEngineCreation.form.engineName.sanitizedNameHelpText',
  {
    defaultMessage: 'Your meta engine will be named',
  }
);

export const META_ENGINE_CREATION_FORM_ENGINE_NAME_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.appSearch.metaEngineCreation.form.engineName.placeholder',
  {
    defaultMessage: 'i.e., my-meta-engine',
  }
);

export const META_ENGINE_CREATION_FORM_ENGINE_SOURCE_ENGINES_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.metaEngineCreation.form.sourceEngines.label',
  {
    defaultMessage: 'Add source engines to this meta engine',
  }
);

export const META_ENGINE_CREATION_FORM_MAX_SOURCE_ENGINES_WARNING_TITLE = (
  maxEnginesPerMetaEngine: number
) =>
  i18n.translate(
    'xpack.enterpriseSearch.appSearch.metaEngineCreation.form.sourceEngines.maxSourceEnginesWarningTitle',
    {
      defaultMessage: 'Meta engines have a limit of {maxEnginesPerMetaEngine} source engines',
      values: { maxEnginesPerMetaEngine },
    }
  );

export const META_ENGINE_CREATION_SUCCESS_MESSAGE = (name: string) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.metaEngineCreation.successMessage', {
    defaultMessage: "Meta engine '{name}' was created",
    values: { name },
  });
