# Test Package for Deployment Modes

This is a test package for verifying deployment_modes functionality in Fleet.

## Policy Templates

### mixed_modes
Template with inputs supporting different deployment modes:
- logs: supports both default and agentless
- metrics: default mode only  
- http_endpoint: agentless only
- winlog: no deployment_modes specified (fallback to blocklist)

### agentless_only
Template that only supports agentless deployment:
- cloudwatch: AWS CloudWatch metrics
- s3: AWS S3 access logs

### default_only
Template that only supports default deployment:
- filestream: File stream input
- system: System metrics collection
