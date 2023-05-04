# Summary

Original PR: https://github.com/elastic/kibana/pull/127218
The goal here is to create a system of schemas that are:

- Easy to read
- Usable historical records of alert schemas from previous Kibana versions
- Accurate for every field
- Usable on both server and client side

# Motivation - Development speed and quality

We have already run into one bug (https://github.com/elastic/kibana/issues/125885) where a required field was not populated in some alert documents. Once a bug ships that creates documents incorrectly, any fix requires user action to initiate a re-index of the alerts in addition to the developer time to create and validate the fix. The changes proposed here would catch this bug at compile time. These sorts of bugs become harder to catch as the schema evolves over time and fields get added, removed, and changed. Keeping the schemas separated by version will help reduce the risk of repeated schema changes over time causing fields to be incorrectly included in or omitted from alert documents.

We are also spending more time than necessary communicating details of the alerts schema over Slack and Zoom. It will be far more efficient for the code to clearly communicate more details about the alert schema. With a more comprehensive static schema, the knowledge will transfer to new developers more efficiently.

Static types are a powerful tool for ensuring code correctness. However, each deviation of the static type from the actual runtime structure adds places where developers may need to cast, assert, or use conditional logic to satisfy the compiler. The current static types require frequent workarounds when the static types don't match what developers know or believe is true about the runtime type of the alert documents. These runtime workarounds establish patterns that evade the type system - costing developer time to create and maintain in addition to increasing the risk of bugs due to the additional complexity. Accurate static types are excellent documentation of the data structures we use but it's crucial that the static types are comprehensive to minimize cases where runtime checks are needed.

# Structure - Common Alert Schema Directory

The schemas in this directory have 2 primary purposes: (1) separate the alert document schemas from the FieldMaps, and (2) set up a code structure that enables easy versioning of alert schemas. During the Detection Engine migration to the rule registry we used the FieldMaps to define the alert schema, but ended up with numerous type casts and some bugs in the process. This common directory stores the various alert schemas by Kibana version.

x-pack/plugins/security_solution/common/detection_engine/schemas/alerts initially contains index.ts and one folder, 8.0.0. index.ts imports the schemas from 8.0.0 and re-exports them as ...Latest, denoting that those are the "write" schemas. The reason for this is that as we add new schemas, there are many places server side where we want to ensure that we're writing the latest alert schema. By having index.ts re-export 8.0.0 schemas, when we add make a new alert schema in the future (e.g. adding an additional field in 8.x) we can simply update index.ts to re-export the new schema instead of the previous schema. index.ts also exports a DetectionAlert which is the "read" schema - this type will be maintained as a union of all versioned alert schemas, which is needed to accurately type alerts that are read from the alerts index.

## Reading vs writing alerts

When writing code that deals with creating a new alert document, always use the schema from alerts/index.ts, not from a specific version folder. This way when the schema is updated in the future, your code will automatically use the latest alert schema and the static type system will tell us if code is writing alerts that don't conform to the new schema.

When writing code that deals with reading alerts, it must be able to handle alerts from any schema version. The "read schema" in index.ts DetectionAlert is a union of all of the versioned alert schemas since a valid alert from the .alerts index could be from any version. Initially there is only one versioned schema, so DetectionAlert is identical to DetectionAlert800.

Generally, Solution code should not be directly importing alert schemas from a specific version. Alert writing code should use the latest schema, and alert reading code should use the union of all schemas.

## Adding new schemas

In the future, when we want to add new fields, we should create a new folder named with the version the field is being added in, create the updated schema in the new folder, and update index.ts to re-export the schemas for the new version instead of the previous version. Also, update the "read schema" DetectionAlert type in index.ts to include the new schema in addition to the previous schemas. The schema in the new version folder can either build on the previous version, e.g. 8.4.0 could import the schema from 8.0.0 and simply add a few new fields, or for larger changes the new version could build the schema from scratch. Old schemas should not change when new fields are added!

## Changing existing schemas

The schema in the 8.0.0 folder, and any future versioned folders after the version is released, should not be updated with new fields. Old schemas should only be updated if a bug is discovered and it is determined that the schema does not accurately represent the alert documents that were actually written by that version, e.g. if a field is typed as string in the schema but was actually written as string[]. The goal of these schemas is to represent documents accurately as they were written and since we aren't changing the documents that already exist, the schema should generally not change.

## No changes

If a version of Kibana makes no changes to the schema, a new folder for that version is not needed.

# Design decisions

- Why not combine the FieldMaps and alert schema, creating a single structure that can define both?
  FieldMaps are integrated tightly with Elasticsearch mappings already, with minimal support for accurate TypeScript types of the fields. We want to avoid adding tons of extra information in to the FieldMaps that would not be used for the Elasticsearch mappings. Instead later we can write a bit of code to ensure that the alert schemas are compatible with the FieldMap schemas, essentially ensuring that the alert schemas extend the FieldMap schemas.

- Why is | undefined used in field definitions instead of making fields optional?
  Making all fields required, but some | undefined in the type, helps ensure that we don't forget to copy over fields that may be undefined. If the field is optional, e.g. [ALERT_RULE_NOTE]?: string, then the compiler won't complain if the field is completely left out when we build the alert document. However, when it's defined as [ALERT_RULE_NOTE]: string | undefined instead, the field must be explicitly provided when creating an object literal of the alert type - even if the value is undefined. This makes it harder to forget to populate all of the fields. This can be seen in build_alert.ts where removing one of the optional fields from the return value results in a compiler error.

- Why do we need to version the schemas instead of adding all new fields as | undefined?
  Adding new fields as | undefined when they're actually required reduces the accuracy of the schema, which makes it less useful and harder to work with. If we decide to add a new field and always populate it going forward then accurately representing that in the static type makes it easier to work with alerts during the alert creation process. When a field is typed as | undefined but a developer knows that it should always exist, it encourages patterns that fight the type system through type-casting, assertions, using ?? <some default value>, etc. This makes the code harder to read, harder to reason about, and thus harder to maintain because the knowledge of "this field is typed as | undefined but actually always exists here" is not represented in the code and only lives in developers minds. Versioned alert schemas aim to turn the static types into an asset that precisely documents what the alert document structure is.
