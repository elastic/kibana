# Use of worker threads

See following performance characteristics of generating a PDF buffer
using a worker thread, for a given, small PDF report. TL;DR running this code for
a small report in a release build is _far_ more performant and takes about 20%
of the time of dev builds.

### Dev build: new worker for each run + transpile from TS (seconds)

```
3.885
3.063
2.64
2.821
```

### Release build: new worker for each run + no transpile from TS (seconds)

```
0.674
0.77
0.712
0.77
```

Transpiling TS code is expensive (very small reports can take up to 5x longer).
However, release builds ship all JS which is far more performant for generating
PDF buffers.

### Use of long-lived workers

One alternative that was investigated is use of long-lived workers. This would
mean re-using a single worker over time for making a PDF buffer. The following
performance was observed for dev and release builds on non-initial runs that did
not instantiate a new worker:

```
0.328
0.332
0.368
0.328
0.341
0.358
0.316
0.257
0.378
0.326
```

Clearly there is overhead for just instantiating a worker thread. We decided to
avoid long-lived workers for our initial implementation since, even though it is
about ~50% extra time the overhead for small reports this number (~0.3s) will
be proportionally far smaller for larger, more common PDFs. That take longer
to compile.
