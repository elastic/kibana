# Quickstart for Developers

These tools make it fast and easy to create detection rules, exceptions, value lists, and source data for testing.

## Usage

`node x-pack/plugins/security_solution/scripts/quickstart/run.js`: Runs the script defined in `scratchpad.ts`
Options:
--username: User name to be used for auth against elasticsearch and kibana (Default: elastic).
--password: User name Password (Default: changeme)
--kibana: The url to Kibana (Default: http://127.0.0.1:5601). In most cases you'll want to set this URL to include the basepath as well.
--apikey: The API key for authentication, overrides username/password - use for serverless projects

`scratchpad.ts` already contains code to set up clients for Elasticsearch and Kibana. In addition it provides clients for Security Solution, Lists, and Exceptions APIs, built on top of the Kibana client. However, it does not create any rules/exceptions/lists/data - it's a blank slate for you to immediately begin creating the resources you want for testing. Please don't commit data-generating code to `scratchpad.ts`! Instead, when you have built a data-generating script that might be useful to others, please extract the useful components to the `quickstart/modules` folder and leave `scratchpad.ts` empty for the next developer.

### Environments

The API clients are designed to work with any delivery method - local, cloud, or serverless deployments. For deployments that do not allow username/password auth, use an API key.

## Modules

Extracting data-generating logic into reusable modules that other people will actually use is the hardest part of sharing these scripts. To that end, it's crucial that the modules are organized as neatly as possible and extremely clear about what they do. If the modules are even slightly confusing, it will be faster for people to rebuild the same logic than to figure out how the existing scripts work.

### Data

Functions to create documents with various properties. This initial implementation has a function to create a document with an arbitrary number of fields and arbitrary amount of data in each field, but should be extended with more functions to create sets of documents with specific relationships such as X total documents with Y number of unique hosts etc.

### Entity Analytics

Functions to help install fake entity analytics data. Useful for testing alert enrichment based on entity analytics.

### Exceptions

Functions to help create exceptions with various properties. For example, one helper takes an array of values and automatically creates a value list exception item from that array - internally, it creates the value list and an exception item that references the list.

### Frozen (TODO)

Functions to help create frozen tier data quickly. These functions (once implemented) will take existing data and immediately move it to frozen for test purposes.

### Lists

Functions to help interact with the Lists APIs. The initial helper function makes it easy to import a value list from an array, since the process of attaching a file to a request (as the API expects) is not that intuitive.

### Mappings

Functions to help setup mappings. Provides the ECS mapping as well as helpers to generate mappings with tons of fields.

### Rules

Functions to help create rules along with data specific to each rule (WIP). Each sample rule defined in this folder should have an associated function to generate data that triggers alerts for the rule.

## Speed

To run a number of API requests in parallel, use `concurrentlyExec` from @kbn/securitysolution-utils.

## Examples

### Create a Rule

```
// Extra imports
import { concurrentlyExec } from '@kbn/securitysolution-utils/src/client_concurrency';
import { basicRule } from './modules/rules/new_terms/basic_rule';
import { duplicateRuleParams } from './modules/rules';

// ... omitted client setup stuff

// Core logic
const ruleCopies = duplicateRuleParams(basicRule, 200);
const functions = ruleCopies.map((rule) => () => detectionsClient.createRule({ body: rule }));
const responses = await concurrentlyExec(functions);
```

### Create 200 Rules and an Exception for each one

```
// Extra imports
import { concurrentlyExec } from '@kbn/securitysolution-utils/src/client_concurrency';
import { basicRule } from './modules/rules/new_terms/basic_rule';
import { duplicateRuleParams } from './modules/rules';
import { buildCreateRuleExceptionListItemsProps } from './modules/exceptions';

// ... omitted client setup stuff

// Core logic
const ruleCopies = duplicateRuleParams(basicRule, 200);
const response = await detectionsClient.bulkCreateRules({ body: ruleCopies });
const createdRules: RuleResponse[] = response.data.filter(
(r) => r.id != null
) as RuleResponse[];

// This map looks a bit confusing, but the concept is simple: take the rules we just created and
// create a *function* per rule to create an exception for that rule. We want a function to call later instead of just
// calling the API immediately to limit the number of requests in flight (with `concurrentlyExec`)
const exceptionsFunctions = createdRules.map(
(r) => () =>
    exceptionsClient.createRuleExceptionListItems(
    buildCreateRuleExceptionListItemsProps({ id: r.id })
    )
);
const exceptionsResponses = await concurrentlyExec(exceptionsFunctions);
```

### Run 10 Rule Preview Requests Simultaneously

```
const previewPromises = range(50).map(
  (idx) => () =>
    detectionsClient.rulePreview({
      body: {
        ...getBasicRuleMetadata(),
        type: 'query',
        timeframeEnd: '2024-08-21T20:37:37.114Z',
        invocationCount: 1,
        from: 'now-6m',
        interval: '5m',
        index: [index],
        query: '*',
      },
    })
);

const results = (await concurrentlyExec(previewPromises, 50)).map(
  (result) => result.data.logs
);
```

## Future Work

### Interactive Mode

It may be useful to have a mode where the CLI waits for input from the user and creates resources selected from a predefined list.

### Resource Tracking/Cleanup

It may also be useful to have the tooling automatically keep track of the created resources so they can be deleted automatically when finished.
