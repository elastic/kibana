## Threat Intelligence

Elastic threat intelligence helps you see if you are open to or have been subject to current or historical known threats

# Useful hints
Export local instance data to es_archives (will be loded in cypress tests)

```
TEST_ES_PORT=9200 node scripts/es_archiver save x-pack/test/threat_intelligence_cypress/es_archives/threat_intelligence "logs-ti*"
```


