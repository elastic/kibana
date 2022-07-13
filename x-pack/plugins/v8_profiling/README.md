# v8_profiling plugin

Provides two endpoints in Kibana for v8 cpu profiles and heap snapshots.

**Warning: the heap snapshot code currently seems to kill Kibana, and not
produce a snapshot.  It might be OOMing.  Heat snapshots are a tire fire.**

## usage

### cpu profile

    curl -kOJ $KBN_URL/_dev/cpu_profile?duration=<seconds>

If no duration parameter is used, the default is 5 seconds.

The -k option allows self-signed certs, and the -O -J options use the 
suggested filename in the response headers as the file to save the content
as.  The file will be named `mm-dd_hh-mm-ss.cpuprofile`.

### heap snapshot

    curl -kOJ $KBN_URL/_dev/heap_snapshot

**This may kill your Kibana server.**

The -k option allows self-signed certs, and the -O -J options use the 
suggested filename in the response headers as the file to save the content
as.  The file will be named `mm-dd_hh-mm-ss.heapsnapshot`.
