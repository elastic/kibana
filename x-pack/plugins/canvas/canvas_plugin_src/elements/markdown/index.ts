/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElementFactory } from '../../../types';
export const markdown: ElementFactory = () => ({
  name: 'markdown',
  displayName: 'Text',
  type: 'text',
  help: 'Add text using Markdown',
  icon: 'visText',
  expression: `kibana
| selectFilter
| demodata
| markdown "### Welcome to the Markdown element

Good news! You're already connected to some demo data!

The data table contains
**{{rows.length}} rows**, each containing
 the following columns:
{{#each columns}}
 **{{name}}**
{{/each}}

You can use standard Markdown in here, but you can also access your piped-in data using Handlebars. If you want to know more, check out the [Handlebars documentation](https://ela.st/handlebars-docs).

#### Enjoy!" | render`,
});
