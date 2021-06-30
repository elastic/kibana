/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const Handlebars = require('@handlebars/parser');
const { HandlebarsEvaluator } = require('./handlebars_evaluator');

const ast = Handlebars.parse(`
Variable:
{{nested.object.name}}

With:
{{#with nested}}
{{#with object}}
{{name}}
parent scope: {{../../people.length}} people
{{/with}}
{{/with}}

Conditional:
{{#if nested.object.name}}
[x] Name prop exists
{{/if}}
{{#unless nested.object.name}}
[ ] Name prop exists
{{/unless}}

Each:
{{#each people}}
- {{this}}
{{/each}}

Math:
{{math rows 'mean(count + total)' 2}}

{{! This comment will not show up in the output}}
`);

const handlebars = new HandlebarsEvaluator(ast);
const contents = handlebars.render({
  nested: {
    object: {
      name: 'Handlebars',
    },
  },
  people: ['Yehuda Katz', 'Alan Johnson', 'Charles Jolley'],
  columns: [
    { id: 'category', name: 'category', meta: { type: 'string', params: { id: 'string' } } },
    { id: 'count', name: 'count', meta: { type: 'number' } },
    { id: 'total', name: 'total', meta: { type: 'number' } },
    { id: 'percentage', name: 'percentage', meta: { type: 'number', params: { id: 'number' } } },
  ],
  rows: [{ category: "Men's Accessories", count: 572, total: 7409, percentage: 8 }],
  type: 'datatable',
});

console.log(contents);
