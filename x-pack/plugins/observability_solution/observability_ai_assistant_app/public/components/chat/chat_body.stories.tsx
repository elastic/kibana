/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentMeta, ComponentStoryObj } from '@storybook/react';
import React from 'react';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/public';
import { KibanaReactStorybookDecorator } from '../../utils/storybook_decorator.stories';
import { ChatBody as Component } from './chat_body';
import { buildSystemMessage } from '../../utils/builders';

const meta: ComponentMeta<typeof Component> = {
  component: Component,
  title: 'app/Organisms/ChatBody',
  decorators: [KibanaReactStorybookDecorator],
};

export default meta;
const defaultProps: ComponentStoryObj<typeof Component> = {
  args: {
    initialTitle: 'My Conversation',
    initialMessages: [
      buildSystemMessage(),
      {
        '@timestamp': new Date().toISOString(),
        message: {
          role: MessageRole.User,
          content: `{"entries":[{"@timestamp":"2023-08-04T06:31:15.160Z","public":false,"confidence":"high","is_correction":false,"namespace":"default","text":"The user's name is Dario.","user":{"name":"elastic","id":"u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0"},"ml":{"model_id":".elser_model_1"}},{"@timestamp":"2023-08-03T16:53:21.848Z","public":true,"confidence":"high","is_correction":false,"namespace":"default","text":"The RENAME command in ES|QL is used to rename a column. The syntax is 'RENAME <new-name> = <old-name>'. For example, 'FROM employees | KEEP first_name, last_name, still_hired | RENAME employed = still_hired' will rename the 'still_hired' column to 'employed'. If a column with the new name already exists, it will be replaced by the new column. Multiple columns can be renamed with a single RENAME command.","user":{"name":"elastic","id":"u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0"},"ml":{"model_id":".elser_model_1"}},{"@timestamp":"2023-08-03T16:52:02.052Z","public":true,"confidence":"high","is_correction":false,"namespace":"default","text":"The KEEP command in ES|QL is used to specify what columns are returned and the order in which they are returned. To limit the columns that are returned, a comma-separated list of column names is used. The columns are then returned in the specified order. Wildcards can also be used to return all columns with a name that matches a pattern. For example, 'FROM employees | KEEP h*' will return all columns with a name that starts with an 'h'. The asterisk wildcard (*) by itself translates to all columns that do not match the other arguments.","user":{"name":"elastic","id":"u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0"},"ml":{"model_id":".elser_model_1"}},{"@timestamp":"2023-08-03T16:55:18.984Z","public":true,"confidence":"high","is_correction":false,"namespace":"default","text":"The WHERE command in ES|QL is used to produce a table that contains all the rows from the input table for which the provided condition evaluates to true. For example, 'FROM employees | KEEP first_name, last_name, still_hired | WHERE still_hired == true' will return only the rows where 'still_hired' is true. WHERE supports various operators and functions for calculating values.","user":{"name":"elastic","id":"u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0"},"ml":{"model_id":".elser_model_1"}},{"@timestamp":"2023-08-03T16:53:57.401Z","public":true,"confidence":"high","is_correction":false,"namespace":"default","text":"The SORT command in ES|QL is used to sort rows on one or more fields. The default sort order is ascending, but this can be explicitly set using ASC or DESC. For example, 'FROM employees | KEEP first_name, last_name, height | SORT height DESC' will sort the rows in descending order of height. Additional sort expressions can be provided to act as tie breakers. By default, null values are treated as being larger than any other value, meaning they are sorted last in an ascending order and first in a descending order. This can be changed by providing NULLS FIRST or NULLS LAST.","user":{"name":"elastic","id":"u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0"},"ml":{"model_id":".elser_model_1"}},{"@timestamp":"2023-08-03T16:50:09.345Z","public":true,"confidence":"high","is_correction":false,"namespace":"default","text":"The EVAL command in ES|QL is used to append new columns to a table. For example, 'FROM employees | KEEP first_name, last_name, height | EVAL height_feet = height * 3.281, height_cm = height * 100' will append new columns 'height_feet' and 'height_cm' to the 'employees' table. If the specified column already exists, the existing column will be dropped, and the new column will be appended to the table. EVAL supports various functions for calculating values.","user":{"name":"elastic","id":"u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0"},"ml":{"model_id":".elser_model_1"}},{"@timestamp":"2023-08-03T16:49:37.882Z","public":true,"confidence":"high","is_correction":false,"namespace":"default","text":"The ENRICH command in ES|QL is used to add data from existing indices to incoming records at query time. It requires an enrich policy to be executed, which defines a match field and a set of enrich fields. ENRICH looks for records in the enrich index based on the match field value. The matching key in the input dataset can be defined using 'ON <field-name>'. If it’s not specified, the match will be performed on a field with the same name as the match field defined in the enrich policy. You can specify which attributes to be added to the result using 'WITH <field1>, <field2>...' syntax. Attributes can also be renamed using 'WITH new_name=<field1>'. By default, ENRICH will add all the enrich fields defined in the enrich policy to the result. In case of name collisions, the newly created fields will override the existing fields.","user":{"name":"elastic","id":"u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0"},"ml":{"model_id":".elser_model_1"}},{"@timestamp":"2023-08-03T16:50:45.339Z","public":true,"confidence":"high","is_correction":false,"namespace":"default","text":"The GROK command in ES|QL enables you to extract structured data out of a string. GROK matches the string against patterns, based on regular expressions, and extracts the specified patterns as columns. For example, 'ROW a = "1953-01-23T12:15:00Z 127.0.0.1 some.email@foo.com 42" | GROK a "%{TIMESTAMP_ISO8601:date} %{IP:ip} %{EMAILADDRESS:email} %{NUMBER:num:int}" | KEEP date, ip, email, num' will extract the date, IP, email, and number from the string into separate columns. Refer to the grok processor documentation for the syntax of grok patterns.","user":{"name":"elastic","id":"u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0"},"ml":{"model_id":".elser_model_1"}},{"@timestamp":"2023-08-03T16:44:22.647Z","public":true,"confidence":"high","is_correction":false,"namespace":"default","text":"The FROM source command in ES|QL returns a table with up to 10,000 documents from a data stream, index, or alias. Each row in the table represents a document, and each column corresponds to a field, which can be accessed by the name of that field. Date math can be used to refer to indices, aliases and data streams, which is useful for time series data. Comma-separated lists or wildcards can be used to query multiple data streams, indices, or aliases.","user":{"name":"elastic","id":"u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0"},"ml":{"model_id":".elser_model_1"}},{"@timestamp":"2023-08-03T16:42:52.832Z","public":true,"confidence":"high","is_correction":false,"namespace":"default","text":"ES|QL, the Elasticsearch Query Language, is a query language designed for iterative data exploration. An ES|QL query consists of a series of commands, separated by pipes. Each query starts with a source command that produces a table, typically with data from Elasticsearch. This can be followed by one or more processing commands that modify the input table by adding, removing, or changing rows and columns. Processing commands can be chained together, with each command working on the output table of the previous command. The result of a query is the table produced by the final processing command. ES|QL can be used via the _esql endpoint, and results are returned as JSON by default. It can also be used in Kibana's Discover and Lens features for data exploration and visualization. Currently, ES|QL supports field types such as alias, boolean, date, ip, keyword family, double/float/half_float, long int/short/byte, and version.","user":{"name":"elastic","id":"u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0"},"ml":{"model_id":".elser_model_1"}}]}`,
        },
      },
    ],
    knowledgeBase: {
      status: {
        loading: false,
        value: {
          ready: true,
        },
        refresh: () => {},
      },
      isInstalling: false,
      install: async () => {},
    },
    connectors: {
      connectors: [
        {
          id: 'foo',
          referencedByCount: 1,
          actionTypeId: 'foo',
          name: 'GPT-v8-ultra',
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
        },
      ],
      loading: false,
      error: undefined,
      selectedConnector: 'foo',
      selectConnector: () => {},
      reloadConnectors: () => {},
    },
    currentUser: {
      username: 'elastic',
      full_name: '',
    },
  },
  render: (props) => {
    return (
      <div style={{ height: '100vh', display: 'flex', maxWidth: 600 }}>
        <Component {...props} />
      </div>
    );
  },
};

export const ChatBody: ComponentStoryObj<typeof Component> = {
  ...defaultProps,
};
