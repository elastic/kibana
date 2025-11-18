# Knowledge Base Test Integration Troubleshooting Guide

This guide provides solutions to common issues you might encounter with the Knowledge Base Test integration.

## Common Issues

### Configuration Problems

#### Issue: Log files not being collected

**Symptoms:** No data appearing in Kibana despite configuration

**Solutions:**

1. Verify the log file paths are correct
2. Check file permissions - ensure the agent can read the files
3. Validate the log file patterns match existing files
4. Review agent logs for permission errors

#### Issue: Integration not appearing in Fleet

**Symptoms:** Package not visible in integration catalog

**Solutions:**

1. Verify package is properly installed
2. Check package manifest for syntax errors
3. Restart Fleet server if necessary
4. Clear browser cache and refresh

### Connection Issues

#### Issue: Agent not receiving policy updates

**Symptoms:** Configuration changes not reflected on agents

**Solutions:**

1. Verify network connectivity between agent and Fleet server
2. Check Fleet server status and logs
3. Validate agent enrollment and health status
4. Review firewall and proxy settings

#### Issue: Data not reaching Elasticsearch

**Symptoms:** Logs collected but not indexed

**Solutions:**

1. Check Elasticsearch cluster health
2. Verify index templates are properly installed
3. Review ILM policies and settings
4. Check for mapping conflicts

### Performance Issues

#### Issue: High CPU usage from log collection

**Symptoms:** Agent consuming excessive resources

**Solutions:**

1. Reduce log collection frequency
2. Implement log filtering to reduce volume
3. Use more specific file patterns
4. Monitor system resources and adjust accordingly

#### Issue: Slow data ingestion

**Symptoms:** Delays in data appearing in Kibana

**Solutions:**

1. Check Elasticsearch indexing performance
2. Review ingest pipeline configurations
3. Monitor network latency and bandwidth
4. Consider batch size optimizations

## Advanced Troubleshooting

### Log Analysis

Use these commands to analyze agent logs:

```bash
# View agent logs
tail -f /opt/Elastic/Agent/logs/elastic-agent.log

# Check specific integration logs
grep "knowledge_base_test" /opt/Elastic/Agent/logs/elastic-agent.log
```

### Network Diagnostics

Test network connectivity:

```bash
# Test Fleet server connectivity
curl -v https://your-fleet-server:8220/api/status

# Test Elasticsearch connectivity
curl -v https://your-elasticsearch:9200/_cluster/health
```

## Getting Help

If you continue to experience issues:

1. Check the integration documentation
2. Review Fleet and agent logs
3. Contact your system administrator
4. Open a support ticket with relevant log excerpts

Remember to include relevant configuration details and log excerpts when seeking support.
