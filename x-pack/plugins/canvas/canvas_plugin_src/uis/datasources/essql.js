/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { EsqlLang } from '@kbn/monaco';
import { EuiFormRow, EuiLink, EuiText } from '@elastic/eui';
import { CodeEditorField } from '@kbn/kibana-react-plugin/public';
import { getSimpleArg, setSimpleArg } from '../../../public/lib/arg_helpers';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { DataSourceStrings, SQL_URL } from '../../../i18n';

const { Essql: strings } = DataSourceStrings;

class EssqlDatasource extends PureComponent {
  componentDidMount() {
    const query = this.getQuery();
    if (typeof query !== 'string') {
      this.setArg(this.getArgName(), this.defaultQuery);
    } else {
      this.props.setInvalid(!query.trim());
    }
  }

  defaultQuery = `SELECT * FROM "${this.props.defaultIndex}"`;

  getQuery = () => getSimpleArg(this.getArgName(), this.props.args)[0];

  // TODO: This is a terrible way of doing defaults. We need to find a way to read the defaults for the function
  // and set them for the data source UI.
  getArgName = () => {
    const { args } = this.props;
    if (getSimpleArg('_', args)[0]) {
      return '_';
    }
    if (getSimpleArg('q', args)[0]) {
      return 'q';
    }
    return 'query';
  };

  setArg = (name, value) => {
    const { args, updateArgs } = this.props;
    updateArgs &&
      updateArgs({
        ...args,
        ...setSimpleArg(name, value),
      });
  };

  onChange = (value) => {
    this.props.setInvalid(!value.trim());
    this.setArg(this.getArgName(), value);
  };

  editorDidMount = (editor) => {
    const model = editor.getModel();
    model?.updateOptions({ tabSize: 2 });
  };

  render() {
    const { isInvalid } = this.props;

    return (
      <EuiFormRow
        isInvalid={isInvalid}
        label={strings.getLabel()}
        labelAppend={
          <EuiText size="xs">
            <EuiLink href={SQL_URL} target="_blank">
              {strings.getLabelAppend()}
            </EuiLink>
          </EuiText>
        }
      >
        <CodeEditorField
          languageId={EsqlLang.ID}
          value={this.getQuery()}
          onChange={this.onChange}
          className="canvasTextArea__code"
          options={{
            fontSize: 14,
            scrollBeyondLastLine: false,
            quickSuggestions: true,
            minimap: { enabled: false },
            wordWrap: 'on',
            wrappingIndent: 'indent',
            lineNumbers: 'off',
            glyphMargin: false,
            folding: false,
          }}
          height="350px"
          editorDidMount={this.editorDidMount}
        />
      </EuiFormRow>
    );
  }
}

EssqlDatasource.propTypes = {
  args: PropTypes.object.isRequired,
  updateArgs: PropTypes.func,
  isInvalid: PropTypes.bool,
  setInvalid: PropTypes.func,
  defaultIndex: PropTypes.string,
};

export const essql = () => ({
  name: 'essql',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  image: 'database',
  template: templateFromReactComponent(EssqlDatasource),
});
