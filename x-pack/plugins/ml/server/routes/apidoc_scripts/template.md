<% if (header) { -%>
<%- header %>
<% } -%>

<a name="top"></a>
v<%= project.version %>

<%= project.description %>

<% if (prepend) { -%>
<%- prepend %>
<% } -%>
<% data.forEach(group => { -%>

## <a name='<%= toLink(group.name) %>'></a> <%= group.name %>
<% group.subs.forEach(sub => { -%>

### <a name='<%= toLink(sub.title) %>'></a> <%= sub.title %>
[Back to top](#top)

<%- sub.description ? `${sub.description}\n\n` : '' -%>
```
<%- sub.type.toUpperCase() %> <%= sub.url %>
```
<% if (sub.header && sub.header.fields && sub.header.fields.Header.length) { -%>

##### Headers
| Name    | Type      | Description                          |
|---------|-----------|--------------------------------------|
<% sub.header.fields.Header.forEach(header => { -%>
| <%- header.field %> | <%- header.type ? `\`${header.type}\`` : '' %> | <%- header.optional ? '**optional**' : '' %><%- header.description %> |
<% }) // foreach parameter -%>
<% } // if parameters -%>
<% if (sub.header && sub.header.examples && sub.header.examples.length) { -%>

##### Header examples
<% sub.header.examples.forEach(example => { -%>
<%= example.title %>

```
<%- example.content %>
```
<% }) // foreach example -%>
<% } // if example -%>
<% if (sub.parameter && sub.parameter.fields) { -%>
<% Object.keys(sub.parameter.fields).forEach(g => { -%>

##### Parameters - `<%= g -%>`
| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
<% sub.parameter.fields[g].forEach(param => { -%>
| <%- param.field -%> | <%- param.type ? `\`${param.type}\`` : '' %> | <%- param.optional ? '**optional** ' : '' -%><%- param.description -%>
<% if (param.defaultValue) { -%>
_Default value: <%= param.defaultValue %>_<br><% } -%>
<% if (param.size) { -%>
_Size range: <%- param.size %>_<br><% } -%>
<% if (param.allowedValues) { -%>
_Allowed values: <%- param.allowedValues %>_<% } -%> |
<% }) // foreach (group) parameter -%>
<% }) // foreach param parameter -%>
<% } // if parameters -%>
<% if (sub.examples && sub.examples.length) { -%>

##### Examples
<% sub.examples.forEach(example => { -%>
<%= example.title %>

```
<%- example.content %>
```
<% }) // foreach example -%>
<% } // if example -%>
<% if (sub.parameter && sub.parameter.examples && sub.parameter.examples.length) { -%>

##### Parameters examples
<% sub.parameter.examples.forEach(exampleParam => { -%>
`<%= exampleParam.type %>` - <%= exampleParam.title %>

```<%= exampleParam.type %>
<%- exampleParam.content %>
```
<% }) // foreach exampleParam -%>
<% } // if exampleParam -%>
<% if (sub.success && sub.success.fields) { -%>

##### Success response
<% Object.keys(sub.success.fields).forEach(g => { -%>

###### Success response - `<%= g %>`
| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
<% sub.success.fields[g].forEach(param => { -%>
| <%- param.field %> | <%- param.type ? `\`${param.type}\`` : '' %> | <%- param.optional ? '**optional**' : '' %><%- param.description -%>
<% if (param.defaultValue) { -%>
_Default value: <%- param.defaultValue %>_<br><% } -%>
<% if (param.size) { -%>
_Size range: <%- param.size -%>_<br><% } -%>
<% if (param.allowedValues) { -%>
_Allowed values: <%- param.allowedValues %>_<% } -%> |
<% }) // foreach (group) parameter -%>
<% }) // foreach field -%>
<% } // if success.fields -%>
<% if (sub.success && sub.success.examples && sub.success.examples.length) { -%>

##### Success response example
<% sub.success.examples.forEach(example => { -%>

###### Success response example - `<%= example.title %>`

```
<%- example.content %>
```
<% }) // foreach success example -%>
<% } // if success.examples -%>
<% if (sub.error && sub.error.fields) { -%>

##### Error response
<% Object.keys(sub.error.fields).forEach(g => { -%>

###### Error response - `<%= g %>`
| Name     | Type       | Description                           |
|:---------|:-----------|:--------------------------------------|
<% sub.error.fields[g].forEach(param => { -%>
| <%- param.field %> | <%- param.type ? `\`${param.type}\`` : '' %> | <%- param.optional ? '**optional**' : '' %><%- param.description -%>
<% if (param.defaultValue) { -%>
_Default value: <%- param.defaultValue %>_<br><% } -%>
<% if (param.size) { -%>
_Size range: <%- param.size -%>_<br><% } -%>
<% if (param.allowedValues) { -%>
_Allowed values: <%- param.allowedValues %>_<% } -%> |
<% }) // foreach (group) parameter -%>
<% }) // foreach field -%>
<% } // if error.fields -%>
<% if (sub.error && sub.error.examples && sub.error.examples.length) { -%>

##### Error response example
<% sub.error.examples.forEach(example => { -%>

###### Error response example - `<%= example.title %>`

```
<%- example.content %>
```
<% }) // foreach error example -%>
<% } // if error.examples -%>
<% }) // foreach sub -%>
<% }) // foreach group -%>
