# Contributing

Before contributing to this plugin, make sure you read the [contributing guide for Kibana](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md), as well as the [STYLEGUIDE](https://github.com/elastic/kibana/blob/main/STYLEGUIDE.mdx) and [TYPESCRIPT](https://github.com/elastic/kibana/blob/main/TYPESCRIPT.md) md files..

> Kibana recommends working on a fork of the [elastic/kibana repository](https://github.com/elastic/kibana) (see [here](https://docs.github.com/en/get-started/quickstart/fork-a-repo) to learn about forks).

> This plugin uses TypeScript, see Kibana's recommendation here.

## Submitting a Pull Request (PR)

Before you submit your PR, consider the following guidelines:

1. Be sure that an issue describes the problem you're fixing, or documents the design for the feature you'd like to add.

2. Make your changes in a new git branch.

   ```
   git checkout -b my-branch main
   ```
   
3. Commit your changes using a descriptive commit message that follows our commit message conventions:

   ```
   git commit -a
   ```

4. Push your branch to GitHub:

   ```
   git push origin my-fix-branch
   ```

5. In GitHub, create a PR.

   Note: If changes are suggested, then make the required updates, [rebase](https://hackernoon.com/git-merge-vs-rebase-whats-the-diff-76413c117333) your branch, and force push (this will update your PR):

   ```
   git rebase main -i
   git push -f
   ```

## Commit Message Guidelines

> **Note:** These guidelines are **recommended - not mandatory**.

### Commit Message Format

Each commit message consists of a **header**, **body**, and **footer**.

```
<subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

Example:

```
[TIP] Threat Intelligence initial commit

- create Threat Intelligence plugin and integrate with Security Solution plugin
- update Kibana CODEOWNERS
- setup jest unit tests, i18n and Storybook

elastic/security-team#4329
elastic/security-team#4241
```

#### Subject

The subject should contain a succinct description of the change. Use the imperative, present tense: "change" not "changed" nor "changes".

#### Body
Just as in the subject, use the imperative, present tense: "change" not "changed" nor "changes". The body should include the motivation for the change and contrast this with previous behavior. Don't forget to include related GitHub issue.

#### Footer

The footer should contain any information about **Breaking Changes** and is also the place to reference issues.

#### Revert

If the commit reverts a previous commit, it should begin with `revert:`, followed by the header of the reverted commit. In the body it should say: `This reverts commit <hash>.`, where the hash is the SHA of the commit being reverted.

## Code Review

You should review every line of code you have been asked to review and consider each of the following points during code review.

#### Functionality

Check Acceptance Criteria of the issue related to the PR. Do the changes cover the AC? It is hard to understand how some changes will impact a user when you are just reading code. You should run the code yourself and validate the behavior. Think about edge cases and how the change might affect other features not directly related to the PR in question

#### UX/UI

Do the changes match the designs? If there were no designs provided, do a sanity UX/UI check: do the changes follow the best practives, are they consistent with the rest of the plugin, Security Solution, Kibana? Are there any custom UX components or behaviours implemented? If yes, could they be implemented with what's already available in EUI or other Kibana plugins?

#### Complexity

Are the changes more complex than necessary? Are individual lines, functions, classes, etc. too complex? "Too complex" usually means "cannot be understood quickly by code readers". It can also mean "developers are likely to introduce bugs when they try to call or modify the code."

A particular type of complexity is over-engineering, where developers have made the code more generic than it needs to be, or added functionality that is not presently needed. The developer should solve the problem they know needs to be solved now, not the problem they speculate might need to be solved in the future.

#### Tests

Ask for tests as appropriate for the changes. Truly untestable features are rare. Make sure the tests are correct, sensible, and useful. Will the tests actually fail when the code is broken?

Remember that tests are also code that has to be maintained. Do not accept complexity in tests just because they do not have a user-facing impact.

#### Comments

Did the developer write clear and understandable comments? Are all the comments necessary? Comments should explain why some code exists, not what it is doing. If the code is not clear enough to explain itself, then it should be made simpler. Comments are for information that the code itself cannot contain, like the reasoning behind a decision.

Are there TODO comments? TODOs just pile up in code and become stale over time. The developer should create a Jira issue and link to the issue from their comment.

Comments are different from documentation, which instead expresses the purpose of some code, how it should be used, and how it behaves when used.

### Documentation

If changes are made to how developers build, test, interact with, or release code, check to see that associated documentation was updated, including READMEs..

## How to test

**Storybook:**

`node scripts/storybook threat_intelligence`

**Unit tests:**

`npm run test:jest --config ./x-pack/plugins/threat_intelligence`

**E2E tests:**

```
node scripts/build_kibana_platform_plugins
cd x-pack/plugins/threat_intelligence
yarn cypress:open-as-ci
```

