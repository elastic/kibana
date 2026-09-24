# Cloud Connector Test (AWS)

Test fixture package used by the Fleet cloud connector API integration tests.

It declares a single `aws/metrics` input with a `role_arn` variable, and one `metrics` data stream
whose stream also declares a `role_arn` variable. That shape lets the tests assert that editing a
cloud connector's role ARN fans out to both input-level and stream-level variables of every
referencing package policy.
