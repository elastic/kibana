/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import Markdown from 'markdown-it';
import { EuiTitle, EuiText, EuiSpacer, EuiDescriptionList } from '@elastic/eui';

const md = new Markdown();

export const ArgumentReference = ({ argDef }) => (
  <div>
    <EuiTitle size="xs">
      <h3>{argDef.name}</h3>
    </EuiTitle>
    <EuiSpacer size="s" />

    <EuiText dangerouslySetInnerHTML={getHelp(argDef)} />
    <EuiSpacer size="s" />

    <EuiDescriptionList type="inline" compressed listItems={getArgListItems(argDef)} />
  </div>
);

function getHelp(argDef) {
  return { __html: md.render(argDef.help) };
}

function getArgListItems(argDef) {
  const { aliases, types, default: def, required } = argDef;
  const items = [];
  if (aliases.length) items.push({ title: 'Aliases', description: aliases.join(', ') });
  if (types.length) items.push({ title: 'Types', description: types.join(', ') });
  if (def != null) items.push({ title: 'Default', description: def });
  items.push({ title: 'Required', description: String(Boolean(required)) });
  return items;
}

ArgumentReference.propTypes = {
  argDef: PropTypes.object,
};
