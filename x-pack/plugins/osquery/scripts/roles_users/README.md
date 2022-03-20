Initial version of roles support for Osquery

|                     Role                     | Data Sources<br/> (logs-osquery_manager* index) |          Live Queries           | Saved Queries | Packs | Osquery Integration | Cases | Discovery/Lens | Metrics UI |
|:--------------------------------------------:|:-----------------------------------------------:|:-------------------------------:|:-------------:|:-----:|:-------------------:|:-----:|:-------------:|:----------:|
|          NO Data Source access user          |                      none                       |              none               |     none      | none  |        none         | none  |     none      |      none      |
|           Reader (read-only user)            |                      read                       |              read               |     read      | read  |        none         | none  |     none      |      none      |
|                  T1 Analyst                  |                      read                       | read, write (run saved queries) |     read      | read  |        none         | none  |     none      |      none      |
|                  T2 Analyst                  |                      read                       |        read, write (tbc)        |      all      | read  |        none         | read  |     none      |      none      |
|             Hunter / T3 Analyst              |                      read                       |               all               |      all      |  all  |        none         |  all  |     read      |      all      |
|                 SOC Manager                  |                      read                       |               all               |      all      |  all  |        none         |  all  |     read      |      all      |
| Platform Engineer (data ingest, cluster ops) |                      read                       |               all               |      all      |  all  |         all         |  all  |     read      |      none      |
