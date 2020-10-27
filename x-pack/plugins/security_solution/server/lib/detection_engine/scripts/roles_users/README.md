1. When first starting up elastic, detections will not be available until you visit the page with a SOC Manager role or Platform Engineer role
2. The T1 and T2 Analyst roles do not seem to have much of a functional difference but I created them as is.
3. I gave the Hunter role "all" privileges for saved objects management and builtInAlerts so that they can create rules.
4. Rule Author has the ability to create rules and create value lists
5. SOC Manager and Platform Engineer roles do not have much of a distinctive difference. However, when going through these roles and testing them out I noticed we require "manage" privileges. I'm not sure we need "manage" and could possibly remove it as a requirement but does anyone remember why we needed manage as a privilege for these indices?

|                     Role                     | Data Sources | SIEM ML Jobs/Results |               Lists               | Rules/Exceptions |          Signals/Alerts           |
| :------------------------------------------: | :----------: | :------------------: | :-------------------------------: | :--------------: | :-------------------------------: |
|                  T1 Analyst                  |     read     |         read         |               read                |       read       |               read                |
|                  T2 Analyst                  |     read     |         read         |               read                |       read       |         read, create_doc          |
|             Hunter / T3 Analyst              | read, write  |         read         |               read                |   read, write    |         read, create_doc          |
| Rule Author / Manager / Detections Engineer  | read, write  |         read         |            read, write            |   read, write    |            read, write            |
|                 SOC Manager                  | read, write  |         read         | read, write, create_index, manage |   read, write    | read, write, create_index, manage |
| Platform Engineer (data ingest, cluster ops) | read, write  |         all          |                all                |   read, write    |                all                |
