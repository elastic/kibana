/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'react-ace';
import 'brace/mode/json';
import 'brace/theme/github';

import { EuiButton, EuiFormRow, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import React, { Fragment, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { XJsonLang } from '@kbn/monaco';

import {
  CodeEditorField,
  useKibana,
} from '../../../../../../../../src/plugins/kibana_react/public';
import type { Rule } from '../../model';
import { generateRulesFromRaw, RuleBuilderError } from '../../model';

interface Props {
  rules: Rule | null;
  onChange: (updatedRules: Rule | null) => void;
  onValidityChange: (isValid: boolean) => void;
}

export const JSONRuleEditor = (props: Props) => {
  const docLinks = useKibana().services.docLinks!;
  const [rawRules, setRawRules] = useState(
    JSON.stringify(props.rules ? props.rules.toRaw() : {}, null, 2)
  );

  const [ruleBuilderError, setRuleBuilderError] = useState<RuleBuilderError | null>(null);

  function onRulesChange(updatedRules: string) {
    setRawRules(updatedRules);
    // Fire onChange only if rules are valid
    try {
      const ruleJSON = JSON.parse(updatedRules);
      props.onChange(generateRulesFromRaw(ruleJSON).rules);
      props.onValidityChange(true);
      setRuleBuilderError(null);
    } catch (e) {
      if (e instanceof RuleBuilderError) {
        setRuleBuilderError(e);
      } else {
        setRuleBuilderError(null);
      }
      props.onValidityChange(false);
    }
  }

  function reformatRules() {
    try {
      const ruleJSON = JSON.parse(rawRules);
      setRawRules(JSON.stringify(ruleJSON, null, 2));
    } catch (ignore) {
      // ignore
    }
  }

  return (
    <EuiFormRow
      isInvalid={Boolean(ruleBuilderError)}
      error={
        ruleBuilderError &&
        i18n.translate('xpack.security.management.editRoleMapping.JSONEditorRuleError', {
          defaultMessage: 'Invalid rule definition at {ruleLocation}: {errorMessage}',
          values: {
            ruleLocation: ruleBuilderError.ruleTrace.join('.'),
            errorMessage: ruleBuilderError.message,
          },
        })
      }
      fullWidth
      data-test-subj="roleMappingsJSONEditor"
    >
      <Fragment>
        <CodeEditorField
          aria-label={''}
          languageId={XJsonLang.ID}
          value={rawRules}
          onChange={onRulesChange}
          fullWidth={true}
          height="300px"
          options={{
            accessibilitySupport: 'off',
            lineNumbers: 'on',
            fontSize: 12,
            tabSize: 2,
            automaticLayout: true,
            minimap: { enabled: false },
            overviewRulerBorder: false,
            scrollbar: { alwaysConsumeMouseWheel: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            wrappingIndent: 'indent',
          }}
        />
        <EuiSpacer size="s" />
        <EuiButton iconType="broom" onClick={reformatRules} size="s">
          <FormattedMessage
            id="xpack.security.management.editRoleMapping.autoFormatRuleText"
            defaultMessage="Reformat"
          />
        </EuiButton>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.security.management.editRoleMapping.JSONEditorHelpText"
              defaultMessage="Specify your rules in JSON format consistent with the {roleMappingAPI}"
              values={{
                roleMappingAPI: (
                  <EuiLink
                    href={docLinks.links.apis.createRoleMapping}
                    external={true}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.security.management.editRoleMapping.JSONEditorEsApi"
                      defaultMessage="Elasticsearch role mapping API."
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </Fragment>
    </EuiFormRow>
  );
};
