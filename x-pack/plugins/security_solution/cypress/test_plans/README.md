# Test Plans

This folder contains test plans for the features of Security Solution.

## Folder Structure

The folder is first split into major Security Solution domains:

- `detection_response`
- `threat_hunting`
- etc

And then each major domain is split into subdomains, for example:

- `detection_response`
  - `prebuilt_rules`
  - `rule_exceptions`
  - `rule_management`
  - `rule_monitoring`
  - etc
- `threat_hunting`
  - `explore`
  - `timelines`
  - etc

Within each subdomain, you can organize test plans as you like, for example:

- you might want to have a folder per feature, if your features are large and you have multiple test plans per feature
- or you might want to have a plain list of test plans if features are relatively small

## Ownership

Each subdomain folder should be owned by a single GitHub team in the `.github/CODEOWNERS` file.
