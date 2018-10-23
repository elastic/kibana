/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import Markdown from 'markdown-it';
import { EuiTitle, EuiText, EuiSpacer, EuiBasicTable, EuiDescriptionList } from '@elastic/eui';
import { startCase } from 'lodash';

const md = new Markdown();

export const FunctionReference = ({ fnDef }) => (
  <div>
    <EuiTitle size="xs">
      <h3>{fnDef.name}</h3>
    </EuiTitle>
    <EuiSpacer size="s" />

    <EuiText dangerouslySetInnerHTML={getHelp(fnDef)} />
    <EuiSpacer size="m" />

    <EuiDescriptionList
      type="inline"
      className="autocompleteDescList"
      compressed
      listItems={getFnListItems(fnDef)}
    />
    <EuiSpacer size="m" />

    <EuiBasicTable
      className="autocompleteTable"
      items={getArgItems(fnDef.args)}
      columns={getArgColumns()}
    />
  </div>
);

function getHelp(fnDef) {
  return { __html: md.render(fnDef.help) };
}

function getFnListItems(fnDef) {
  const { aliases, context, type } = fnDef;
  const items = [];
  if (aliases.length) items.push({ title: 'Aliases', description: aliases.join(', ') });
  if (context.types) items.push({ title: 'Accepts', description: context.types.join(', ') });
  if (type) items.push({ title: 'Returns', description: type });
  return items;
}

function getArgItems(args) {
  return Object.entries(args).map(([name, argDef]) => ({
    argument: name + (argDef.required ? '*' : ''),
    aliases: (argDef.aliases || []).join(', '),
    types: (argDef.types || []).join(', '),
    default: argDef.default || '',
    description: argDef.help || '',
  }));
}

function getArgColumns() {
  return ['argument', 'aliases', 'types', 'default', 'description'].map(field => {
    const column = { field, name: startCase(field), truncateText: field !== 'description' };
    if (field === 'description') column.width = '50%';
    return column;
  });
}

FunctionReference.propTypes = {
  fnDef: PropTypes.object,
};
